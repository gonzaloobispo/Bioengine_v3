import sys
sys.path.insert(0, r'c:\BioEngine_V3\backend')
from services.cost_control import CostControl

cc = CostControl()
status = cc.get_status()

print('\n' + '='*60)
print('ESTADO DE MODELOS MULTI-CEREBRO')
print('='*60 + '\n')

print('Modelos Gratuitos:')
for m in status['free_models']:
    print(f'  - {m["provider"]}: {m["usage_count"]} usos')

print('\nModelos Pagos:')
for m in status['paid_models']:
    allowed_text = "(PERMITIDO)" if m["allowed"] else "(BLOQUEADO)"
    print(f'  - {m["provider"]}: {m["usage_count"]} usos, ${m["cost_usd"]:.4f} {allowed_text}')

print(f'\nCosto total estimado: ${status["total_cost_usd"]:.4f}')
print('\n' + '='*60)
