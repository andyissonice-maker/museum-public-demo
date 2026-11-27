(() => {
  const user = {
    id: 'public-demo-viewer', name: '演示访客', role: 'member',
    permissions: ['projects:view', 'tasks:view', 'calendar:view', 'documents:view', 'photos:view', 'contacts:view', 'ai:use'],
  };
  const now = new Date();
  const instant = (days = 0, hour = 10) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };
  const day = (days) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(instant(days)));
  const project = (id, code, name, status, description, start, end, completed, total) => ({
    id, code, name, status, description, canEdit: false, version: 1,
    owner: { name: '演示馆员' }, ownerId: null, startsOn: day(start), endsOn: day(end),
    progress: { completed, total }, members: [], coverPhotoId: null,
  });
  const projects = [
    project('demo-exhibit', 'DEMO-01', '江南工艺与生活', 'active', '展示纸本、织物和日用器物的专题展览。此处为演示资料。', -7, 18, 2, 5),
    project('demo-collection', 'DEMO-02', '馆藏整理与开放日', 'planning', '馆藏目录核对及公众导览筹备。此处为演示资料。', -2, 26, 1, 3),
  ];
  const tasks = [
    { id: 'demo-task-1', projectId: projects[0].id, name: '复核第一批展品标签', description: '对照样例清单检查展签和摆放位置。', status: 'in_progress', type: 'personal', priority: 'high', dueAt: instant(2), version: 1, assigneeId: user.id, assignee: { name: user.name }, collaborators: [], createdByName: '演示馆员' },
    { id: 'demo-task-2', projectId: projects[1].id, name: '整理开放日导览路线', description: '准备入口、集合点和导览顺序。', status: 'pending_review', type: 'personal', priority: 'normal', dueAt: instant(4), version: 1, assigneeId: user.id, assignee: { name: user.name }, collaborators: [], createdByName: '演示馆员' },
  ];
  const calendar = [
    ['demo-event-1', projects[0], '展签与布展进度核对', 0, 14],
    ['demo-event-2', projects[1], '开放日导览彩排', 2, 10],
  ].map(([id, item, name, offset, hour]) => ({
    id, projectId: item.id, projectName: item.name, name, startsAt: instant(offset, hour),
    endsAt: instant(offset, hour + 1), version: 1, allDay: false, ownerId: null,
    ownerName: '演示馆员', participants: [], remindMinutes: null, contactName: null,
  }));
  const documents = [
    ['demo-file-1', projects[0].id, '展签校对稿.docx', 18472],
    ['demo-file-2', projects[0].id, '借展物件清单.xlsx', 58030],
    ['demo-file-3', projects[1].id, '馆藏开放日导览.pdf', 242016],
    ['demo-file-4', null, '馆务工作说明.pdf', 55296],
  ].map(([id, projectId, name, size]) => ({
    id, projectId, name, size, folderId: null, version: 1, contentRevision: 1,
    createdAt: instant(-2), updatedAt: instant(-1), uploadedByName: '演示馆员',
    canManage: false, category: { name: '演示资料' },
  }));
  const scoped = (rows, query) => {
    if (query.has('projectId')) return rows.filter(row => row.projectId === query.get('projectId'));
    if (query.get('scope') === 'company') return rows.filter(row => row.projectId === null);
    return rows;
  };
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  });
  const unavailable = () => json({ error: '公开演示仅供浏览。当前操作需要连接真实馆务服务。' }, 403);
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href);
    if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return original(input, init);
    const method = (init?.method || (input instanceof Request && input.method) || 'GET').toUpperCase();
    const path = url.pathname.slice(4);
    const query = url.searchParams;
    if (method === 'GET') {
      switch (path) {
        case '/auth/me': return json({ user });
        case '/health': return json({ ok: true, demo: true });
        case '/projects':
        case '/projects/roster':
        case '/documents/projects':
        case '/tasks/projects':
        case '/photos/projects':

        case '/calendar/projects': return json(query.has('cursor') ? [] : projects);
        case '/tasks': return json(scoped(tasks, query));
        case '/calendar': return json(scoped(calendar, query));
        case '/documents': return json(scoped(documents, query));
        case '/inbox': return json({ notices: [], unread: 0 });
        case '/conversations': return json({ items: [], nextCursor: null });
        case '/contacts/ai/status': return json({ available: false });
        case '/tags': return json({ tags: [] });
        case '/dispatch/inbox':
        case '/dispatch/sent': return json({ items: [], nextCursor: null });
        case '/me/layout': return json({}, 404);
      }
      if (path.startsWith('/projects/') && path.split('/').length === 3) {
        const item = projects.find(row => row.id === path.split('/').at(-1));
        return item ? json(item) : json({ error: '未找到演示项目' }, 404);
      }
      if (/^\/(folders|photos|albums|contacts|groups)(\/|$)/.test(path) ||
          /\/(records|submissions|revisions)$/.test(path)) return json([]);
      return unavailable();
    }
    return unavailable();
  };
  // Keep any demonstration-only editing action from pointing at the viewer's machine.
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== location.origin && ['127.0.0.1', 'localhost'].includes(url.hostname) ||
        url.origin === location.origin && url.pathname.startsWith('/api/')) {
      event.preventDefault();
      document.querySelector('#museum-demo-label').textContent = '演示版 · 文件编辑和下载未开放';
    }
  }, true);
})();
