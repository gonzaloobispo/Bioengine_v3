import urllib.request
import json
with urllib.request.urlopen('http://localhost:8001/plans') as res:
  data = json.loads(res.read().decode('utf-8'))
  print('First 10 IDs in order:', [p['id'] for p in data[:10]])
