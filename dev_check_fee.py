import json
import urllib.request
import urllib.error

base = 'http://localhost:5000'
headers = {'Content-Type': 'application/json'}

def call(path, method='GET', data=None, token=None):
    req = urllib.request.Request(base + path, data=data, method=method, headers=headers.copy())
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    try:
        with urllib.request.urlopen(req) as res:
            return res.status, res.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

try:
    status, body = call('/api/auth/admin/login', 'POST', json.dumps({'username': 'admin', 'password': 'Admin@123'}).encode())
    print('LOGIN', status, body)
    login = json.loads(body)
    token = login.get('token')
    if not token:
        raise SystemExit('NO TOKEN')

    status, body = call('/api/admin/sessions', 'GET', None, token)
    print('SESSIONS', status, body)
    sessions = json.loads(body or '[]')
    if not sessions:
        status, body = call('/api/admin/sessions', 'POST', json.dumps({'name': '2025/2026', 'startDate': '2025-09-01', 'endDate': '2026-07-31'}).encode(), token)
        print('CREATE SESSION', status, body)
        status, body = call('/api/admin/sessions', 'GET', None, token)
        sessions = json.loads(body or '[]')

    session_id = sessions[0].get('id') if sessions else None
    print('SESSION ID', session_id)
    if not session_id:
        raise SystemExit('NO SESSION ID')

    status, body = call(f'/api/admin/sessions/{session_id}/terms', 'GET', None, token)
    print('TERMS', status, body)
    terms = json.loads(body or '[]')
    if not terms:
        status, body = call(f'/api/admin/sessions/{session_id}/terms', 'POST', json.dumps({'name': 'Term 1', 'startDate': '2025-09-01', 'endDate': '2025-12-15'}).encode(), token)
        print('CREATE TERM', status, body)
        status, body = call(f'/api/admin/sessions/{session_id}/terms', 'GET', None, token)
        terms = json.loads(body or '[]')

    term_id = terms[0].get('id') if terms else None
    print('TERM ID', term_id)
    if not term_id:
        raise SystemExit('NO TERM ID')

    fee_payload = {
        'sessionId': session_id,
        'termId': term_id,
        'classLevel': 'JSS 1',
        'newStudentBaseTuition': 1000,
        'newStudentBoardingFee': 500,
        'newStudentSchoolBusFee': 200,
        'returningStudentBaseTuition': 800,
        'returningStudentBoardingFee': 400,
        'returningStudentSchoolBusFee': 150,
    }
    status, body = call('/api/admin/fee-structures', 'POST', json.dumps(fee_payload).encode(), token)
    print('CREATE FEE', status, body)
    status, body = call(f'/api/admin/terms/{term_id}/fee-structures', 'GET', None, token)
    print('LOAD FEES', status, body)
except Exception as e:
    print('ERROR', e)
