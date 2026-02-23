#!/usr/bin/env python3
"""
RPR Scraper — HTTP-only approach using Scrapling Fetcher + curl_cffi.
No browser needed. Login via POST, search via API, parse with Scrapling.
"""

import json
import re
import httpx
from scrapling.fetchers import Fetcher

SUPABASE_URL = 'https://vbwcatbixcgakdwgdavl.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZid2NhdGJpeGNnYWtkd2dkYXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY5MzM4NywiZXhwIjoyMDg3MjY5Mzg3fQ.2j0q61nh9cJJa420-SxBEJMA2SuPRft6azAPNT8-C_M'
RPR_USERNAME = 'JosephineDuCreay@gmail.com'
RPR_PASSWORD = 'Slrhomes$$@2024'


def step1_get_login_page():
    """Fetch the login page to get CSRF token and cookies"""
    print('🔐 Step 1: Fetching login page...')
    
    page = Fetcher.get(
        'https://www.narrpr.com/',
        follow_redirects=True,
        timeout=15,
    )
    
    print(f'  Status: {page.status}')
    print(f'  URL: {page.url}')
    
    # Find the login form action and any hidden fields
    forms = page.css('form')
    print(f'  Forms: {len(forms)}')
    
    for form in forms:
        action = form.attrib.get('action', '')
        method = form.attrib.get('method', 'GET')
        print(f'  Form: action="{action}" method="{method}"')
        
        # Get all hidden inputs (CSRF tokens, etc.)
        hidden_inputs = {}
        for inp in form.css('input[type="hidden"]'):
            name = inp.attrib.get('name', '')
            value = inp.attrib.get('value', '')
            if name:
                hidden_inputs[name] = value
                print(f'    Hidden: {name}={value[:50]}...' if len(value) > 50 else f'    Hidden: {name}={value}')
        
        return {
            'action': action,
            'method': method,
            'hidden_inputs': hidden_inputs,
            'url': str(page.url),
            'cookies': dict(page.cookies) if hasattr(page, 'cookies') else {},
        }
    
    return None


def step2_login(form_data):
    """Submit login form via POST"""
    print('\n🔐 Step 2: Submitting login...')
    
    action = form_data['action']
    if not action.startswith('http'):
        # Relative URL — resolve against login page
        from urllib.parse import urljoin
        action = urljoin(form_data['url'], action)
    
    print(f'  POST to: {action}')
    
    # Build form payload
    payload = {**form_data['hidden_inputs']}
    payload['Email'] = RPR_USERNAME
    payload['Password'] = RPR_PASSWORD
    
    print(f'  Payload keys: {list(payload.keys())}')
    
    response = Fetcher.post(
        action,
        data=payload,
        follow_redirects=True,
        timeout=15,
    )
    
    print(f'  Status: {response.status}')
    print(f'  URL: {response.url}')
    
    # Check if we got redirected to the main site
    url = str(response.url)
    if 'narrpr.com/home' in url or ('auth' not in url and 'login' not in url):
        print('  ✅ Login appears successful!')
        return response
    else:
        print('  ❌ Still on auth page')
        # Check for error messages
        errors = response.css('.error, .alert, [class*="error"], [class*="alert"]')
        for err in errors:
            print(f'  Error: {err.text.strip()[:100]}')
        return None


def step3_search(session_cookies, address, zip_code):
    """Search for a property using RPR's API"""
    clean_addr = re.sub(r'\s*(LOT\s*\d+|#\s*REAR|REAR)\s*', '', address, flags=re.IGNORECASE).strip()
    query = f'{clean_addr}, Atlanta, GA {zip_code}'
    print(f'\n🔍 Searching: {query}')
    
    # Try RPR's autocomplete API directly
    search_url = f'https://www.narrpr.com/api/search/autocomplete?q={query}'
    
    response = Fetcher.get(
        search_url,
        cookies=session_cookies,
        timeout=15,
    )
    
    print(f'  Status: {response.status}')
    
    # Try to parse JSON response
    try:
        body = response.text
        if body.startswith('{') or body.startswith('['):
            data = json.loads(body)
            print(f'  Got search results: {json.dumps(data)[:200]}')
            return data
    except:
        pass
    
    print(f'  Body preview: {response.text[:200]}')
    return None


def get_top_lots():
    url = (f'{SUPABASE_URL}/rest/v1/lots'
           '?select=id,property_address,property_city,property_zip,county'
           '&property_address=not.like.0 *'
           '&lead_score=gte.60'
           '&order=lead_score.desc'
           '&limit=5')
    
    resp = httpx.get(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}'
    })
    return resp.json()


def main():
    print('🏠 RPR Scraper (HTTP-only, Scrapling) — Starting')
    print('=' * 50)
    
    # Step 1: Get login page
    form = step1_get_login_page()
    if not form:
        print('❌ Could not find login form')
        return
    
    # Step 2: Login
    session = step2_login(form)
    if not session:
        print('❌ Login failed')
        return
    
    # Step 3: Search lots
    lots = get_top_lots()
    print(f'\n📋 {len(lots)} lots to search')
    
    for lot in lots:
        step3_search(
            {},  # TODO: extract session cookies
            lot['property_address'],
            lot['property_zip']
        )
    
    print('\n🏁 Done')


if __name__ == '__main__':
    main()
