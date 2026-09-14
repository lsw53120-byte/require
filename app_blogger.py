import os
import io
import re
import json
import datetime
from PIL import Image, ImageOps
import streamlit as st

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from google import genai
from google.genai import types

# 페이지 기본 설정
st.set_page_config(page_title="Blogger 자동 포스팅 스튜디오", page_icon="🚀", layout="wide")

SCOPES = ['https://www.googleapis.com/auth/blogger', 'https://www.googleapis.com/auth/drive.file']
MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro']

# --- 클라우드 전용 구글 인증 ---
def get_oauth_credentials():
    creds = None
    if "gcp_token" in st.secrets:
        token_info = dict(st.secrets["gcp_token"])
        try:
            creds = Credentials.from_authorized_user_info(token_info, SCOPES)
        except Exception as e:
            st.error(f"토큰 로드 실패: {e}")

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                st.error("❌ 구글 인증 토큰이 만료되었습니다. 관리자에게 문의하세요.")
                st.stop()
        else:
            st.error("❌ 서버 환경(Secrets)에 구글 인증 설정이 누락되었습니다.")
            st.stop()
    return creds

# --- 유틸 및 비전 처리 함수 ---
def upload_in_memory_to_drive(drive_service, file_name, image_bytes, mimetype='image/jpeg'):
    try:
        file_metadata = {'name': file_name}
        fh = io.BytesIO(image_bytes)
        media = MediaIoBaseUpload(fh, mimetype=mimetype, resumable=True)
        file = drive_service.files().create(body=file_metadata, media_body=media, fields='id').execute()
        file_id = file.get('id')
        drive_service.permissions().create(fileId=file_id, body={'type': 'anyone', 'role': 'reader'}).execute()
        return f"https://lh3.googleusercontent.com/d/{file_id}"
    except Exception as e:
        st.error(f"⚠️ 구글 드라이브 업로드 실패 ({file_name}): {e}")
        return None

def process_uploaded_images(uploaded_files):
    processed = []
    for f in uploaded_files:
        try:
            img = Image.open(f)
            try: img = ImageOps.exif_transpose(img)
            except: pass
            
            max_dim = 1600
            if max(img.size) > max_dim:
                scale = max_dim / max(img.size)
                img = img.resize((int(img.width * scale), int(img.height * scale)), Image.Resampling.LANCZOS)
            
            if img.mode != 'RGB': img = img.convert('RGB')
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=90)
            processed.append({'name': f.name, 'pil': img, 'bytes': buf.getvalue()})
        except Exception as e:
            st.warning(f"이미지 변환 실패 ({f.name}): {e}")
    return processed

def parse_json_response(raw_text):
    try:
        code_block = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, flags=re.DOTALL)
        if code_block: return json.loads(code_block.group(1))
        json_match = re.search(r'\{.*\}', raw_text, flags=re.DOTALL)
        if json_match: return json.loads(json_match.group(0))
        cleaned = re.sub(r'^```(json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
        cleaned = re.sub(r'\s*```$', '', cleaned)
        return json.loads(cleaned)
    except:
        return {}

def clean_html_response(raw_text):
    match = re.search(r'```(?:html)?\s*(.*?)\s*```', raw_text, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else raw_text.strip()

# --- Gemini API 호출 (완벽 교정 버전) ---
def analyze_images_and_get_metadata(gemini_client, pil_images, image_names, user_hint=""):
    prompt = f"""
    당신은 전문 여행/맛집 블로거이자 SEO/AEO 최적화 전문가입니다.
    제공된 이미지들({image_names})과 사용자 힌트("{user_hint}")를 면밀히 분석하여 다음 항목을 순수 JSON 형식으로만 생성하세요. 마크다운 기호(```json 등)는 절대 포함하지 말고 오직 {{ 로 시작해서 }} 로 끝나는 JSON 문자열만 출력하세요.

    필수 키 구조:
    {{
      "title": "사진의 장소명, 핵심 특징이 포함된 매력적인 블로그 제목 (50자 이내)",
      "memo": "사진 속 장소와 상황에 대한 상세한 요약 설명",
      "slug": "영문 소문자와 하이픈(-)만 사용한 퍼머링크용 슬러그 (예: yangyang-ottogi-restaurant)",
      "labels": ["맛집", "지역명 등 관련 라벨 2~3개"],
      "search_description": "검색엔진 최적화(SEO)를 위한 130자 이내의 매력적인 요약문"
    }}
    """
    for model in MODELS_TO_TRY:
        try:
            res = gemini_client.models.generate_content(model=model, contents=[prompt] + pil_images)
            if res and res.text:
                parsed = parse_json_response(res.text)
                if parsed and "title" in parsed:
                    return parsed
        except Exception as e:
            continue
            
    # 비상 폴백 데이터 (AI 파싱 실패 시 힌트 기반 생성)
    fallback_title = f"{user_hint if user_hint else '국내 여행 및 맛집'} 탐방 솔직 후기"
    return {
        "title": fallback_title,
        "memo": "사진 속 장소와 방문 후기를 정리한 포스팅입니다.",
        "slug": "travel-review-" + datetime.datetime.now().strftime("%m%d%H%M"),
        "labels": ["국내여행", "맛집탐방"],
        "search_description": f"{fallback_title}에 대한 상세한 정보와 생생한 방문 후기를 확인해보세요."
    }

def generate_html_post(gemini_client, meta, pil_images, image_names):
    prompt = f"""
    제목: {meta['title']}
    요약: {meta['memo']}
    위 정보를 바탕으로 방문자들에게 유익하고 구글 SEO/AEO에 최적화된 HTML 블로그 본문을 작성하세요.

    [매우 중요한 이미지 삽입 규칙]
    제공된 사진 파일명 목록: {image_names}
    본문을 작성할 때, 위 사진 파일명들을 반드시 하나씩 사용하여 알맞은 위치에 아래 스타일을 적용하여 삽입하세요:
    <div style="text-align: center; margin: 25px 0;"><img src="파일명" alt="사진 설명" style="max-width: 100%; height: auto; border-radius: 8px;"></div>
    파일명을 임의로 지어내거나 'IMG'라고 쓰면 절대 안 됩니다.

    마크다운 없이 순수 HTML 태그(<h2>, <blockquote>, <p>, <div>, <img> 등)로만 작성하세요.
    """
    for model in MODELS_TO_TRY:
        try:
            res = gemini_client.models.generate_content(model=model, contents=[prompt] + pil_images)
            if res and res.text: 
                return clean_html_response(res.text)
        except: 
            continue
    return f"<p>{meta['memo']}</p>"

# --- UI 레이아웃 및 실행 ---
st.title("🚀 Blogger 클라우드 자동 포스팅")
st.caption("PC와 스마트폰 어디서든 접속하여 사진만 올리면 블로그스팟에 즉시 발행됩니다.")

uploaded_files = st.file_uploader("📷 블로그에 사용할 사진 선택 (다중 선택 가능)", type=['png', 'jpg', 'jpeg', 'webp'], accept_multiple_files=True)
user_hint = st.text_input("💡 [선택] 방문한 지역, 식당명 등의 힌트")

if st.button("✨ 사진 분석 및 원클릭 포스팅 시작", type="primary", use_container_width=True):
    if not uploaded_files:
        st.error("최소 1장 이상의 사진을 선택해주세요.")
        st.stop()
        
    api_key = st.secrets.get("GEMINI_API_KEY")
    if not api_key:
        st.error("서버에 Gemini API 키가 설정되지 않았습니다.")
        st.stop()
        
    client = genai.Client(api_key=api_key)

    with st.status("로봇이 사진을 정밀 분석하고 포스팅을 작성 중입니다...", expanded=True) as status:
        st.write("🖼️ 이미지 최적화 및 파일명 매핑 준비 중...")
        processed_images = process_uploaded_images(uploaded_files)
        pil_images = [item['pil'] for item in processed_images]
        image_names = [item['name'] for item in processed_images]
        
        st.write("🧠 Gemini AI가 사진 속 현장 정보를 정밀 스캐닝 및 메타데이터 추출 중...")
        meta = analyze_images_and_get_metadata(client, pil_images, image_names, user_hint)

        st.write("✍️ SEO 최적화 HTML 본문 작성 중...")
        html_code = generate_html_post(client, meta, pil_images, image_names)

        st.write("☁️ 구글 드라이브에 이미지 업로드 및 직링크 치환 중...")
        creds = get_oauth_credentials()
        drive_service = build('drive', 'v3', credentials=creds)
        
        final_html = html_code
        for item in processed_images:
            url = upload_in_memory_to_drive(drive_service, item['name'], item['bytes'])
            if url:
                final_html = re.sub(rf'src=[\'"][^\'"]*{re.escape(item["name"])}[\'"]', f'src="{url}"', final_html)
            
        # 검색 설명 메타 태그 추가
        final_html = f"<!-- SEO Meta --><meta name=\"description\" content=\"{meta['search_description']}\">\n" + final_html

        st.write("📡 블로그스팟에 메타데이터 및 본문 최종 발행 중...")
        blogger = build('blogger', 'v3', credentials=creds)
        blogs = blogger.blogs().listByUser(userId='self', role='ADMIN').execute()
        blog_id = blogs['items'][0]['id']
        blog_name = blogs['items'][0]['name']

        # 블로그스팟 포스트 바디 구성
        post_body = {
            'kind': 'blogger#post',
            'title': meta['title'],
            'content': final_html,
            'labels': meta['labels'],
            'customMetaData': meta['search_description']
        }
        
        # 발행 실행
        post = blogger.posts().insert(blogId=blog_id, body=post_body, isDraft=False).execute()
        post_id = post.get('id')
        post_url = post.get('url', '')

        status.update(label="🎉 발행 완료!", state="complete")

    st.success(f"[{blog_name}] 블로그에 성공적으로 포스팅 되었습니다!")
    st.markdown(f"**📌 적용된 제목:** {meta['title']}")
    st.markdown(f"**🏷️ 적용된 라벨:** {', '.join(meta['labels'])}")
    st.markdown(f"**🔎 검색 설명:** {meta['search_description']}")
    
    col1, col2 = st.columns(2)
    with col1:
        st.link_button("👉 발행된 포스트 보러가기", post_url, use_container_width=True)
    with col2:
        st.link_button("✏️ 블로그스팟 수정 화면으로 가기", f"[https://www.blogger.com/blog/post/edit/](https://www.blogger.com/blog/post/edit/){blog_id}/{post_id}", use_container_width=True)
