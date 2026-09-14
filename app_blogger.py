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
MODELS_TO_TRY = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']

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
    code_block = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw_text, flags=re.DOTALL)
    if code_block: return json.loads(code_block.group(1))
    json_match = re.search(r'\{.*\}', raw_text, flags=re.DOTALL)
    if json_match: return json.loads(json_match.group(0))
    cleaned = re.sub(r'^```(json)?\s*', '', raw_text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    return json.loads(cleaned)

def clean_html_response(raw_text):
    match = re.search(r'```(?:html)?\s*(.*?)\s*```', raw_text, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else raw_text.strip()

# --- Gemini API 호출 ---
def extract_facts_from_images(gemini_client, pil_images):
    prompt = "사진 속 간판 상호명, 주소, 전화번호, 메뉴/가격을 추출하세요."
    for model in MODELS_TO_TRY:
        try:
            res = gemini_client.models.generate_content(model=model, contents=[prompt] + pil_images)
            if res and res.text: return res.text.strip()
        except: continue
    return ""

def generate_post_metadata_multimodal(gemini_client, raw_facts, user_hint=""):
    prompt = f"""
    팩트 데이터({raw_facts})와 사용자 힌트({user_hint})를 바탕으로 메타데이터를 작성하세요.
    - title: 50자 이내 한글 제목
    - memo: 사진 속 사실 요약
    - slug: 블로그스팟 영문 퍼머링크 (영문소문자와 하이픈만 사용, 예: delicious-food)
    - labels: 라벨 리스트 (예: ["맛집", "여행"])
    - search_description: 검색 설명 130자 이내
    순수 JSON으로만 출력: {{"title": "...", "memo": "...", "slug": "...", "labels": ["..."], "search_description": "..."}}
    """
    search_config = types.GenerateContentConfig(tools=[{"google_search": {}}])
    for model in MODELS_TO_TRY:
        try:
            res = gemini_client.models.generate_content(model=model, contents=prompt, config=search_config)
            if res and res.text: return parse_json_response(res.text)
        except: continue
    return {"title": "스마트폰 자동 포스팅", "memo": "내용 요약", "slug": "auto-post", "labels": ["기본라벨"], "search_description": "자동 작성된 글입니다."}

def generate_aeo_geo_seo_post_multimodal(gemini_client, title, user_memo, pil_images, raw_facts, image_names):
    prompt = f"""
    제목({title}), 요약({user_memo}), 팩트({raw_facts})를 바탕으로 SEO HTML 블로그 본문을 작성하세요.
    [매우 중요한 이미지 삽입 규칙]
    제공된 사진 파일명 목록: {image_names}
    본문을 작성할 때, 위 사진 파일명들을 반드시 하나씩 사용하여 알맞은 위치에 `<img src="파일명" alt="상황 설명">` 형태로 삽입하세요. 파일명을 임의로 지어내거나 IMG라고 쓰면 절대 안 됩니다.

    마크다운 없이 순수 HTML 태그(<h2>, <blockquote>, <p>, <img>)로만 구성하고 이미지에는 `<div style="text-align: center; margin: 25px 0;"><img src="파일명" alt="묘사" style="max-width: 100%; height: auto; border-radius: 8px;"></div>` 스타일을 적용하세요.
    """
    for model in MODELS_TO_TRY:
        try:
            res = gemini_client.models.generate_content(model=model, contents=[prompt] + pil_images)
            if res and res.text: return clean_html_response(res.text)
        except: continue
    return "<p>본문 생성에 실패했습니다.</p>"

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

    with st.status("로봇이 포스팅을 자동 작성 중입니다...", expanded=True) as status:
        st.write("🖼️ 이미지 용량 및 방향 최적화 중...")
        processed_images = process_uploaded_images(uploaded_files)
        pil_images = [item['pil'] for item in processed_images]
        image_names = [item['name'] for item in processed_images] # 파일명 목록 추출
        
        st.write("🔍 사진 속 정보(간판, 메뉴 등) 팩트 분석 중...")
        raw_facts = extract_facts_from_images(client, pil_images)
        
        st.write("🌐 포스팅 제목, 태그, 검색엔진 메타데이터 도출 중...")
        meta = generate_post_metadata_multimodal(client, raw_facts, user_hint)

        st.write("✍️ 전문가 수준의 HTML 본문 작성 중...")
        # 파일명 목록을 AI에게 전달하여 <img> 태그에 정확히 삽입하도록 지시
        html_code = generate_aeo_geo_seo_post_multimodal(client, meta['title'], meta['memo'], pil_images, raw_facts, image_names)

        st.write("☁️ 구글 드라이브에 이미지 업로드 및 직링크 추출 중...")
        creds = get_oauth_credentials()
        drive_service = build('drive', 'v3', credentials=creds)
        
        final_html = html_code
        for item in processed_images:
            url = upload_in_memory_to_drive(drive_service, item['name'], item['bytes'])
            if url:
                # AI가 작성한 <img src="파일명"> 부분을 구글 드라이브 직링크로 완벽하게 치환
                final_html = re.sub(rf'src=[\'"][^\'"]*{re.escape(item["name"])}[\'"]', f'src="{url}"', final_html)
            
        final_html = f"<!-- SEO Meta --><meta name=\"description\" content=\"{meta['search_description']}\">\n" + final_html

        st.write("📡 블로그스팟에 영문 퍼머링크 고정 및 원고 발행 중...")
        blogger = build('blogger', 'v3', credentials=creds)
        blogs = blogger.blogs().listByUser(userId='self', role='ADMIN').execute()
        blog_id = blogs['items'][0]['id']
        blog_name = blogs['items'][0]['name']

        # 1. 영문 슬러그(퍼머링크)로 선발행
        initial_body = {
            'kind': 'blogger#post',
            'title': meta.get('slug', 'auto-post'), 
            'content': final_html,
            'labels': meta.get('labels', []),
            'customMetaData': meta.get('search_description', '')
        }
        post = blogger.posts().insert(blogId=blog_id, body=initial_body, isDraft=False).execute()
        post_id = post.get('id')
        post_url = post.get('url', '')
        
        # 2. 완전한 한글 제목과 데이터로 완벽하게 덮어쓰기 (Update)
        update_body = {
            'kind': 'blogger#post',
            'id': post_id,
            'title': meta.get('title', '제목 없음'),
            'content': final_html,
            'labels': meta.get('labels', []),
            'customMetaData': meta.get('search_description', '')
        }
        blogger.posts().update(blogId=blog_id, postId=post_id, body=update_body).execute()

        status.update(label="🎉 발행 완료!", state="complete")

    st.success(f"[{blog_name}] 블로그에 성공적으로 포스팅 되었습니다!")
    st.markdown(f"**📌 적용된 제목:** {meta.get('title', '')}")
    st.markdown(f"**🏷️ 적용된 라벨:** {', '.join(meta.get('labels', []))}")
    
    col1, col2 = st.columns(2)
    with col1:
        st.link_button("👉 발행된 포스트 보러가기", post_url, use_container_width=True)
    with col2:
        st.link_button("✏️ 블로그스팟 수정 화면으로 가기", f"https://www.blogger.com/blog/post/edit/{blog_id}/{post_id}", use_container_width=True)
