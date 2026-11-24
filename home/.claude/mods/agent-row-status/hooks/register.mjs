import { buildRow } from './row.mjs';

export function register(on) {
  on('ui.render', { component: 'AgentRow' }, async ($, e, next) => {
    const p = e.props;
    if (!p || p.isHidden) return next(e);

    const now = await $.clock.now();
    const columns = (e.viewport && e.viewport.columns) || 120;
    const body = buildRow(p, now, columns);
    if (!body) return next(e);

    return next({ ...e, props: { ...p, body } });
  });
}
