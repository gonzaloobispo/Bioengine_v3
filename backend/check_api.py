import urllib.request
import json
with urllib.request.urlopen('http://localhost:8001/plans') as res:
  data = json.loads(res.read().decode('utf-8'))
  active = [p for p in data if p['status'] == 'active']
  print('Active ids:', [p['id'] for p in active])
