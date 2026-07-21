const state = {
  session: null,
  adminOrders: [],
  auditorOrders: [],
  currentAdminOrder: null,
  currentAuditorOrder: null,
  pendingImportTempId: '',
  pendingImportPreviewRows: [],
  captureRows: [],
  confirmAction: null,
  adminEstadoFilter: '',
  auditorEstadoFilter: '',
  pendingImportDuplicateMode: '',
  pendingImportDuplicateOrders: [],
  pendingImportTotalRows: 0

};
;

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  bindEvents_();
  updateTopbar_();

  try {
    showAppModal_('RECUPERANDO SESIÓN...', true);
    await restoreSession_();
  } catch (e) {
  } finally {
    hideAppModal_();
  }
}

function saveSessionLocal_(session) {
  try {
    localStorage.setItem('token', session && session.token ? session.token : '');
    localStorage.setItem('session', JSON.stringify(session || null));
  } catch (e) {}
}

function clearSessionLocal_() {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('session');
    sessionStorage.removeItem('token');
  } catch (e) {}
}

async function restoreSession_() {
  var token = '';

  try {
    token = localStorage.getItem('token') || '';
  } catch (e) {
    token = '';
  }

  if (!token) {
    resetClientStateOnly_();
    showView_('view-login');
    focus_('usuario');
    return;
  }

  try {
    var res = await apiGetSesion(token);
    state.session = res.session;
    updateTopbar_();

    if (state.session.rol === 'ADMIN') {
      await loadAdminDashboard_();
    } else {
      await loadAuditorDashboard_();
    }
  } catch (err) {
    clearSessionLocal_();
    resetClientStateOnly_();
    showView_('view-login');
    focus_('usuario');
  }
}

function bindEvents_() {
  on_('loginForm', 'submit', handleLogin_);
  on_('btnLogout', 'click', handleLogout_);

  on_('btnGoAdmin', 'click', handleGoAdminView_);
  on_('btnGoAuditor', 'click', handleGoAuditorView_);

  on_('btnDuplicateModeAppend', 'click', function () {
  applyDuplicateImportMode_('APPEND');
});

on_('btnDuplicateModeSkip', 'click', function () {
  applyDuplicateImportMode_('SKIP');
});

on_('btnDuplicateModeCancel', 'click', closeDuplicateOrdersModal_);

  on_('btnAddCaptureRow', 'click', addCaptureRow_);
  on_('btnSaveCaptureRows', 'click', saveCaptureRows_);

  on_('btnAdminRefresh', 'click', loadAdminOrders_);
  on_('btnAdminApplyFilters', 'click', applyAdminFilters_);
  on_('btnAdminClearFilters', 'click', clearAdminFilters_);
  on_('btnBackAdminDashboard', 'click', function () {
    showView_('view-admin-dashboard');
  });
  on_('btnConfirmModalCancel', 'click', closeConfirmModal_);
  on_('btnConfirmModalAccept', 'click', executeConfirmModalAction_);
  on_('btnReiniciarOrden', 'click', handleReiniciarOrdenAdmin_);
  on_('btnAbrirSegundoConteo', 'click', handleAbrirSegundoConteo_);
  on_('btnAbrirTercerConteo', 'click', handleAbrirTercerConteo_);

  on_('btnGoUpload', 'click', function () {
    showView_('view-admin-upload');
  });
  on_('btnDescargarRegistroVerificacion', 'click', handleDescargarRegistroVerificacion_);

  on_('btnBackFromUpload', 'click', function () {
    showView_('view-admin-dashboard');
  });

  on_('btnPreviewPlantilla', 'click', previewPlantilla_);
  on_('btnGuardarPlantilla', 'click', guardarPlantillaPendiente_);

  on_('btnAuditorRefresh', 'click', loadAuditorOrders_);
  on_('btnAuditorApplyFilters', 'click', applyAuditorFilters_);
  on_('btnAuditorClearFilters', 'click', clearAuditorFilters_);
  on_('btnBackAuditorDashboard', 'click', function () {
    showView_('view-auditor-dashboard');
  });

  var adminBody = document.getElementById('adminOrdersBody');
  if (adminBody) {
    adminBody.addEventListener('click', function (e) {
      var delBtn = e.target.closest('.js-admin-delete-order');
      if (delBtn) {
        deleteAdminOrder_(delBtn.dataset.orden || '');
        return;
      }

      var viewBtn = e.target.closest('.js-admin-view-order');
      if (viewBtn) {
        openAdminOrderDetail_(viewBtn.dataset.orden || '');
      }
    });
  }
  var adminEstadoFilters = document.getElementById('adminEstadoFilters');
if (adminEstadoFilters) {
  adminEstadoFilters.addEventListener('click', function (e) {
    var btn = e.target.closest('.estado-filter-btn');
    if (!btn) return;

    var estado = btn.dataset.estado || '';
    state.adminEstadoFilter = normalizeText_(estado);
    updateAdminEstadoButtons_();
    applyAdminFilters_();
  });
}

var auditorBody = document.getElementById('auditorOrdersBody');
if (auditorBody) {
  auditorBody.addEventListener('click', function (e) {
    var btn = e.target.closest('.js-auditor-open-order');
    if (!btn) return;
    if (btn.disabled) return;
    openAuditorOrder_(btn.dataset.orden || '');
  });
}
var auditorEstadoFilters = document.getElementById('auditorEstadoFilters');
if (auditorEstadoFilters) {
  auditorEstadoFilters.addEventListener('click', function (e) {
    var btn = e.target.closest('.estado-filter-btn');
    if (!btn) return;

    var estado = btn.dataset.estado || '';
    state.auditorEstadoFilter = normalizeText_(estado);
    updateAuditorEstadoButtons_();
    applyAuditorFilters_();
  });
}

  var captureGridBody = document.getElementById('captureGridBody');
  if (captureGridBody) {
    captureGridBody.addEventListener('input', handleCaptureGridInput_);
    captureGridBody.addEventListener('keydown', handleCaptureGridKeydown_);
    captureGridBody.addEventListener('focusout', handleCaptureGridFocusOut_);
    captureGridBody.addEventListener('click', function (e) {
      var delBtn = e.target.closest('.js-remove-capture-row');
      if (!delBtn) return;
      removeCaptureRow_(Number(delBtn.dataset.index));
    });
  }
}

async function handleLogin_(e) {
  e.preventDefault();

  var usuario = value_('usuario');
  var clave = value_('clave');

  setMessage_('loginMessage', '');

  if (!usuario || !clave) {
    setMessage_('loginMessage', 'Ingrese usuario y clave.', 'error');
    return;
  }

  try {
    showAppModal_('Iniciando sesión...', true);

    var res = await apiLogin(usuario, clave);
    state.session = res.session;
    saveSessionLocal_(state.session);
    updateTopbar_();

    if (state.session.rol === 'ADMIN') {
      await loadAdminDashboard_();
    } else {
      await loadAuditorDashboard_();
    }

    hideAppModal_();

  } catch (err) {
    hideAppModal_();
    setMessage_('loginMessage', err.message || 'Error de login.', 'error');
  }
}

async function handleLogout_() {
  try {
    showAppModal_('Cerrando sesión...', true);

    if (state.session && state.session.token) {
      await apiLogout(state.session.token);
    }

    clearSessionLocal_();
    resetClientStateOnly_();
    updateTopbar_();
    showView_('view-login');

    setTimeout(function () {
      hideAppModal_();
      focus_('usuario');
    }, 700);

  } catch (e) {
    clearSessionLocal_();
    resetClientStateOnly_();
    updateTopbar_();
    showView_('view-login');

    setTimeout(function () {
      hideAppModal_();
      focus_('usuario');
    }, 700);
  }
}
async function handleGoAdminView_() {
  try {
    showAppModal_('CARGANDO VISTA ADMIN...', true);
    await loadAdminDashboard_();
  } catch (err) {
    alert(err.message || 'Error cargando vista admin.');
  } finally {
    hideAppModal_();
  }
}

async function handleGoAuditorView_() {
  try {
    showAppModal_('CARGANDO VISTA AUDITOR...', true);
    await loadAuditorDashboard_();
  } catch (err) {
    alert(err.message || 'Error cargando vista auditor.');
  } finally {
    hideAppModal_();
  }
}

function resetClientSession_() {
  clearSessionLocal_();
  resetClientStateOnly_();
}

function resetClientStateOnly_() {
  state.session = null;
  state.adminOrders = [];
  state.auditorOrders = [];
  state.currentAdminOrder = null;
  state.currentAuditorOrder = null;
  state.pendingImportTempId = '';
  state.pendingImportPreviewRows = [];
  state.captureRows = [];
  state.confirmAction = null;
  state.pendingImportDuplicateMode = '';
  state.pendingImportDuplicateOrders = [];
  state.pendingImportTotalRows = 0;
  setMessage_('uploadPreviewInfo', '');

  clearHTML_('adminOrdersBody');
  clearHTML_('adminOrderLinesBody');
  clearHTML_('adminOrderAuditBody');
  clearHTML_('auditorOrdersBody');
  clearHTML_('captureHistoryBody');
  clearHTML_('captureGridBody');

  setHTML_('captureLastResult', 'Sin registros');
  setText_('sessionInfo', '');
  setValue_('captureComentarioGlobal', '');
  setValue_('usuario', '');
  setValue_('clave', '');
  setMessage_('loginMessage', '');
  updateTopbar_();
}

function updateTopbar_() {
  var isLogged = !!state.session;
  var isAdmin = isLogged && state.session.rol === 'ADMIN';
  var isAuditor = isLogged && state.session.rol === 'AUDITOR';

  toggleHidden_('btnLogout', !isLogged);
  toggleHidden_('btnGoAdmin', !isAdmin);
  toggleHidden_('btnGoAuditor', !(isAdmin || isAuditor));

  if (isLogged) {
    setText_(
      'sessionInfo',
      state.session.nombre + ' | ' + state.session.usuario + ' | ' + state.session.rol
    );
  } else {
    setText_('sessionInfo', '');
  }
}

async function loadAdminDashboard_() {
  if (!state.session) return;
  await loadAdminOrders_();
  showView_('view-admin-dashboard');
}

async function loadAdminOrders_() {
  try {
    var res = await apiListarOrdenesAdmin_(state.session.token);
    state.adminOrders = res.rows || [];
    updateAdminEstadoCounters_();
    updateAdminEstadoButtons_();
    applyAdminFilters_();
    setText_('adminTotalOrdenes', state.adminOrders.length + ' órdenes');
  } catch (err) {
    alert(err.message || 'Error cargando órdenes de administrador.');
  }
}

function applyAdminFilters_() {
  var fecha = value_('adminFilterFecha');
  var grupo = normalizeText_(value_('adminFilterGrupo'));
  var orden = normalizeText_(value_('adminFilterOrden'));
  var estado = state.adminEstadoFilter || '';

  var filtered = state.adminOrders.filter(function (r) {
    var okFecha = !fecha || toIsoDate_(r.fechaCarga) === fecha;
    var okGrupo = !grupo || normalizeText_(r.grupo).indexOf(grupo) > -1;
    var okOrden = !orden || normalizeText_(r.orden).indexOf(orden) > -1;
    var okEstado = !estado || normalizeText_(r.estado) === estado;

    return okFecha && okGrupo && okOrden && okEstado;
  });

  renderAdminOrders_(filtered);
}
function clearAdminFilters_() {
  setValue_('adminFilterFecha', '');
  setValue_('adminFilterGrupo', '');
  setValue_('adminFilterOrden', '');
  state.adminEstadoFilter = '';
  updateAdminEstadoButtons_();
  renderAdminOrders_(state.adminOrders);
}
function updateAdminEstadoCounters_() {
  var counts = {
    PENDIENTE: 0,
    'EN PROGRESO': 0,
    CONFORME: 0,
    'NO CONFORME': 0
  };

  state.adminOrders.forEach(function (r) {
    var estado = normalizeText_(r.estado);
    if (counts.hasOwnProperty(estado)) {
      counts[estado]++;
    }
  });

  setText_('countPendiente', counts['PENDIENTE']);
  setText_('countProgreso', counts['EN PROGRESO']);
  setText_('countConforme', counts['CONFORME']);
  setText_('countNoConforme', counts['NO CONFORME']);
}

function updateAdminEstadoButtons_() {
  var buttons = document.querySelectorAll('#adminEstadoFilters .estado-filter-btn');
  buttons.forEach(function (btn) {
    var estado = normalizeText_(btn.dataset.estado || '');
    btn.classList.toggle('active', estado === state.adminEstadoFilter);
  });
}

function renderAdminOrders_(rows) {
  var tbody = document.getElementById('adminOrdersBody');
  if (!tbody) return;

  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="14">Sin órdenes para mostrar.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (r, i) {
    return `
      <tr class="${rowStatusClass_(r.estado)}">
        <td>${i + 1}</td>
        <td>${statusBadge_(r.estado)}</td>
        <td>${esc_(r.fechaCarga || '')}</td>
        <td>${esc_(r.grupo || '')}</td>
        <td>${esc_(r.orden || '')}</td>
        <td>${esc_(r.lineas || 0)}</td>
        <td>${esc_(r.registrado || 0)}</td>
        <td>${esc_(r.primerConteo || '')}</td>
        <td>${esc_(r.segundoConteo || '')}</td>
        <td>${esc_(r.tercerConteo || '')}</td>
        <td>${esc_(r.auditorAsignado || '')}</td>
        <td>${esc_(r.comentarioAdmin || '')}</td>
        <td>
          <button class="btn btn-secondary js-admin-view-order" type="button" data-orden="${escAttr_(r.orden || '')}">
            Ver
          </button>
        </td>
        <td>
          <button class="btn btn-danger js-admin-delete-order" type="button" data-orden="${escAttr_(r.orden || '')}">
            X
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openAdminOrderDetail_(orden) {
  try {
    showAppModal_('Aperturando detalle...', true);

    var res = await apiObtenerDetalleOrdenAdmin_(state.session.token, orden);
    state.currentAdminOrder = res;
    renderAdminOrderDetail_(res);

    hideAppModal_();
    showView_('view-admin-detail');
  } catch (err) {
    hideAppModal_();
    alert(err.message || 'Error cargando detalle de la orden.');
  }
}

async function deleteAdminOrder_(orden) {
  if (!orden) return;

  var confirmado = confirm('¿Desea eliminar la orden ' + orden + '?');
  if (!confirmado) return;

  try {
    await apiEliminarOrdenAdmin_(state.session.token, orden);
    await loadAdminOrders_();
  } catch (err) {
    alert(err.message || 'Error eliminando la orden.');
  }
}

function renderAdminOrderDetail_(res) {
  res = res || {};

  var header = res.header || {};
  var lines = Array.isArray(res.lines) ? res.lines : [];
  var registros = Array.isArray(res.registros) ? res.registros : [];

  state.currentAdminOrder = {
    header: header,
    lines: lines,
    registros: registros
  };

  toggleHidden_('btnAbrirSegundoConteo', !header.puedeAbrirConteo2);
  toggleHidden_('btnAbrirTercerConteo', !header.puedeAbrirConteo3);

  setText_('adminDetailOrderTitle', 'Orden ' + (header.orden || ''));
  setText_('detailEstado', header.estado || '');
  setText_('detailGrupo', header.grupo || '');
  setText_('detailOrden', header.orden || '');
  setText_('detailFechaCarga', header.fechaCarga || '');
  setText_('detailAuditorAsignado', header.auditorAsignado || '');
  setText_('detailFechaInicio', header.fechaInicio || '');
  setText_('detailFechaFin', header.fechaFin || '');
  setText_('detailComentarioAdmin', header.comentarioAdmin || '');

  var linesBody = document.getElementById('adminOrderLinesBody');
  if (linesBody) {
    linesBody.innerHTML = lines.length ? lines.map(function (r) {
      return `
        <tr class="${rowStatusClass_(r.estadoLinea || '')}">
          <td>${esc_(r.codigo || '')}</td>
          <td>${esc_(r.lote || '')}</td>
          <td>${esc_(r.fv || '')}</td>
          <td>${esc_(r.ean13 || '')}</td>
          <td>${esc_(r.inner || '')}</td>
          <td>${esc_(r.ean14 || '')}</td>
          <td>${esc_(r.descripcion || '')}</td>
          <td>${esc_(r.cantidad || 0)}</td>
          <td>${esc_(r.conteo1 == null ? '' : r.conteo1)}</td>
          <td>${esc_(r.conteo2 == null ? '' : r.conteo2)}</td>
          <td>${esc_(r.conteo3 == null ? '' : r.conteo3)}</td>

          <td>${statusBadge_(r.estadoLinea || '')}</td>
          <td>${esc_(r.estadoLote || '')}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="13">Sin líneas.</td></tr>';
  }

  var auditBody = document.getElementById('adminOrderAuditBody');
  if (auditBody) {
    auditBody.innerHTML = registros.length ? registros.map(function (r) {
      return `
        <tr class="${priorizadoClass_(r.esPriorizado)}">
          <td>${esc_(r.fechaHora || '')}</td>
          <td>${esc_(r.nroConteo || '')}</td>
          <td>${esc_(r.auditor || '')}</td>
          <td>${esc_(r.tagIdPaleta || '')}</td>
          <td>${esc_(r.escaneado || '')}</td>
          <td>${esc_(r.codigo || '')}</td>
          <td>${esc_(r.cantidadAuditada || 0)}</td>
          <td>${esc_(r.loteAuditado || '')}</td>
          <td>${esc_(r.esPriorizado || '')}</td>
          <td>${esc_(r.resultadoLinea || '')}</td>
          <td>${esc_(r.comentario || '')}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="11">Sin registros de auditoría.</td></tr>';
  }
}

async function handleAbrirSegundoConteo_() {
  if (!state.currentAdminOrder || !state.currentAdminOrder.header) return;

  var orden = state.currentAdminOrder.header.orden;

  showConfirmModal_(
    '¿Desea aperturar el 2do conteo para la orden ' + orden + '?',
    async function () {
      try {
        showAppModal_('APERTURANDO SEGUNDO CONTEO...', true);
        await apiAbrirSegundoConteo(state.session.token, orden);
        var refreshed = await apiObtenerDetalleOrdenAdmin_(state.session.token, orden);
        renderAdminOrderDetail_(refreshed);
        await loadAdminOrders_();
        showAppModal_('SEGUNDO CONTEO APERTURADO CORRECTAMENTE.', false);
        setTimeout(hideAppModal_, 1200);
      } catch (err) {
        hideAppModal_();
        alert(err.message || 'Error aperturando 2do conteo.');
      }
    }
  );
}

async function handleAbrirTercerConteo_() {
  if (!state.currentAdminOrder || !state.currentAdminOrder.header) return;

  var orden = state.currentAdminOrder.header.orden;

  showConfirmModal_(
    '¿Desea aperturar el 3er conteo para la orden ' + orden + '?',
    async function () {
      try {
        showAppModal_('APERTURANDO TERCER CONTEO...', true);
        await apiAbrirTercerConteo(state.session.token, orden);
        var refreshed = await apiObtenerDetalleOrdenAdmin_(state.session.token, orden);
        renderAdminOrderDetail_(refreshed);
        await loadAdminOrders_();
        showAppModal_('TERCER CONTEO APERTURADO CORRECTAMENTE.', false);
        setTimeout(hideAppModal_, 1200);
      } catch (err) {
        hideAppModal_();
        alert(err.message || 'Error aperturando 3er conteo.');
      }
    }
  );
}

async function handleReiniciarOrdenAdmin_() {
  if (!state.currentAdminOrder || !state.currentAdminOrder.header) return;

  var orden = state.currentAdminOrder.header.orden;

  showConfirmModal_(
    '¿Está seguro de reiniciar la orden ' + orden + '? Se borrarán todos los registros del auditor y volverá a Pendiente.',
    async function () {
      try {
        showAppModal_('Reiniciando...', true);

        await apiReiniciarOrdenAdmin_(state.session.token, orden);
        await loadAdminOrders_();

        showAppModal_('Orden reiniciada correctamente.', false);

        setTimeout(function () {
          hideAppModal_();
          showView_('view-admin-dashboard');
        }, 1200);

      } catch (err) {
        hideAppModal_();
        setMessage_('loginMessage', '', '');
        alert(err.message || 'Error reiniciando la orden.');
      }
    }
  );
}

async function loadAuditorDashboard_() {
  if (!state.session) return;

  await loadAuditorOrders_();
  showView_('view-auditor-dashboard');
}

async function loadAuditorOrders_() {
  try {
    var res = await apiListarOrdenesAuditor(state.session.token);
    state.auditorOrders = res.rows || [];
    updateAuditorEstadoCounters_();
    updateAuditorEstadoButtons_();
    applyAuditorFilters_();
    setText_('auditorTotalOrdenes', state.auditorOrders.length + ' órdenes');
  } catch (err) {
    alert(err.message || 'Error cargando órdenes del auditor.');
  }
}
function applyAuditorFilters_() {
  var fecha = value_('auditorFilterFecha');
  var grupo = normalizeText_(value_('auditorFilterGrupo'));
  var orden = normalizeText_(value_('auditorFilterOrden'));
  var estado = state.auditorEstadoFilter || '';

  var filtered = state.auditorOrders.filter(function (r) {
    var okFecha = !fecha || toIsoDate_(r.fechaCarga) === fecha;
    var okGrupo = !grupo || normalizeText_(r.grupo).indexOf(grupo) > -1;
    var okOrden = !orden || normalizeText_(r.orden).indexOf(orden) > -1;
    var okEstado = !estado || normalizeText_(r.estado) === estado;

    return okFecha && okGrupo && okOrden && okEstado;
  });

  renderAuditorOrders_(filtered);
}

function clearAuditorFilters_() {
  setValue_('auditorFilterFecha', '');
  setValue_('auditorFilterGrupo', '');
  setValue_('auditorFilterOrden', '');
  state.auditorEstadoFilter = '';
  updateAuditorEstadoButtons_();
  renderAuditorOrders_(state.auditorOrders);
}

function updateAuditorEstadoCounters_() {
  var counts = {
    PENDIENTE: 0,
    'EN PROGRESO': 0,
    CONFORME: 0,
    'NO CONFORME': 0
  };

  state.auditorOrders.forEach(function (r) {
    var estado = normalizeText_(r.estado);
    if (counts.hasOwnProperty(estado)) {
      counts[estado]++;
    }
  });

  setText_('countAudPendiente', counts['PENDIENTE']);
  setText_('countAudProgreso', counts['EN PROGRESO']);
  setText_('countAudConforme', counts['CONFORME']);
  setText_('countAudNoConforme', counts['NO CONFORME']);
}

function updateAuditorEstadoButtons_() {
  var buttons = document.querySelectorAll('#auditorEstadoFilters .estado-filter-btn');
  buttons.forEach(function (btn) {
    var estado = normalizeText_(btn.dataset.estado || '');
    btn.classList.toggle('active', estado === state.auditorEstadoFilter);
  });
}

function renderAuditorOrders_(rows) {
  var tbody = document.getElementById('auditorOrdersBody');
  if (!tbody) return;

  if (!rows || !rows.length) {
    tbody.innerHTML = '<tr><td colspan="6">Sin órdenes disponibles.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (r, i) {
    return `
      <tr class="${rowStatusClass_(r.estado)}">
        <td>${i + 1}</td>
        <td>${statusBadge_(r.estado)}</td>
        <td>${esc_(r.fechaCarga || '')}</td>
        <td>${esc_(r.grupo || '')}</td>
        <td>${esc_(r.orden || '')}</td>
        <td>
          <button
            class="btn ${r.puedeAbrir ? 'btn-primary' : 'btn-open-disabled'} js-auditor-open-order"
            type="button"
            data-orden="${escAttr_(r.orden || '')}"
            ${r.puedeAbrir ? '' : 'disabled'}
          >
            ${esc_(r.accion || 'Bloqueado')}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openAuditorOrder_(orden) {
  try {
    showAppModal_('Aperturando detalle...', true);

    var res = await apiAbrirOrdenAuditor(state.session.token, orden);
    state.currentAuditorOrder = res;
    renderAuditorCapture_(res);

    hideAppModal_();
    showView_('view-auditor-capture');
    focusCaptureField_(0, 'scan');
  } catch (err) {
    hideAppModal_();
    alert(err.message || 'Error abriendo la orden.');
  }
}

function renderAuditorCapture_(res) {
  setText_('captureOrderTitle', 'Orden ' + (res.header.orden || ''));
  setText_(
    'captureOrderMeta',
    'Grupo: ' + (res.header.grupo || '') +
    ' | Estado: ' + (res.header.estado || '') +
    ' | Auditor: ' + (res.header.auditorAsignado || '')
  );

    if (res.captureRowsSuggested && res.captureRowsSuggested.length) {
    state.captureRows = res.captureRowsSuggested.map(hydrateCaptureRowFromServer_);
  } else {
    state.captureRows = [buildEmptyCaptureRow_()];
  }

  setValue_('captureComentarioGlobal', '');
  renderCaptureGrid_();
  renderCaptureHistory_(res.registros || []);
}

function getConteoActualOrden_(registros) {
  if (!registros || !registros.length) {
    return '1';
  }

  var maxConteo = 1;

  for (var i = 0; i < registros.length; i++) {
    var n = parseInt(registros[i].nroConteo || '1', 10);
    if (!isNaN(n) && n > maxConteo) {
      maxConteo = n;
    }
  }

  return String(maxConteo);
}

function renderCaptureHistory_(rows) {
  var tbody = document.getElementById('captureHistoryBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="11">Sin registros para esta orden.</td></tr>';
    return;
  }

  var ordered = rows.slice().reverse();

  tbody.innerHTML = ordered.map(function (r, i) {
    return `
      <tr class="${priorizadoClass_(r.esPriorizado)}">
        <td>${i + 1}</td>
        <td>${esc_(r.fechaHora || '')}</td>
        <td>${esc_(r.nroConteo || '')}</td>
        <td>${esc_(r.tagIdPaleta || '')}</td>
        <td>${esc_(r.escaneado || '')}</td>
        <td>${esc_(r.codigo || '')}</td>
        <td>${esc_(r.cantidadAuditada || 0)}</td>
        <td>${esc_(r.loteAuditado || '')}</td>
        <td>${esc_(r.esPriorizado || '')}</td>
        <td>${esc_(r.resultadoLinea || '')}</td>
        <td>${esc_(r.comentario || '')}</td>
      </tr>
    `;
  }).join('');
}

async function refreshCurrentAuditorOrder_() {
  if (!state.currentAuditorOrder || !state.currentAuditorOrder.header) return;
  var orden = state.currentAuditorOrder.header.orden;
  var res = await apiAbrirOrdenAuditor(state.session.token, orden);
  state.currentAuditorOrder = res;
  renderAuditorCapture_(res);
}

function renderCaptureLastResult_(r) {
  var box = document.getElementById('captureLastResult');
  if (!box) return;

  var extraClass = (r.esPriorizado === 'SI' || r.resultadoLinea === 'LOTE REQUERIDO')
    ? ' result-box-priorizado'
    : '';

  box.className = 'result-box' + extraClass;

  box.innerHTML = `
    <div><strong>Fecha:</strong> ${esc_(r.fechaHora || '')}</div>
    <div><strong>Orden:</strong> ${esc_(r.orden || '')}</div>
    <div><strong>Conteo:</strong> ${esc_(r.nroConteo || '')}</div>
    <div><strong>TAG ID / Paleta:</strong> ${esc_(r.tagIdPaleta || '')}</div>
    <div><strong>Código / EAN:</strong> ${esc_(r.escaneado || '')}</div>
    <div><strong>Código identificado:</strong> ${esc_(r.codigo || '')}</div>
    <div><strong>Cantidad:</strong> ${esc_(r.cantidadAuditada || 0)}</div>
    <div><strong>Lote:</strong> ${esc_(r.loteAuditado || '')}</div>
    <div><strong>Priorizado:</strong> ${esc_(r.esPriorizado || '')}</div>
    <div><strong>Resultado:</strong> ${esc_(r.resultadoLinea || '')}</div>
    <div><strong>Comentario:</strong> ${esc_(r.comentario || '')}</div>
  `;
}

function previewPlantilla_() {
  var fileInput = document.getElementById('filePlantilla');
  var file = fileInput && fileInput.files ? fileInput.files[0] : null;

  if (!file) {
    setMessage_('uploadMessage', 'Seleccione un archivo Excel primero.', 'error');
    return;
  }

  if (!/\.(xlsx|xls)$/i.test(file.name)) {
    setMessage_('uploadMessage', 'Solo se permite archivo Excel .xlsx o .xls.', 'error');
    return;
  }

  var reader = new FileReader();

  reader.onload = async function (e) {
    try {
      showAppModal_('Analizando archivo...', true);

      var result = String(e.target.result || '');
      var base64 = result.split(',')[1] || '';

      if (!base64) {
        throw new Error('No se pudo leer el archivo.');
      }

      var res = await apiPreviewPlantillaExcel(state.session.token, file.name, base64);

      state.pendingImportTempId = res.tempSpreadsheetId || '';
      state.pendingImportPreviewRows = res.previewRows || [];
      state.pendingImportDuplicateOrders = res.duplicateOrderDetails || [];
      state.pendingImportTotalRows = res.total || 0;
      state.pendingImportDuplicateMode = '';

      hideAppModal_();

      if (state.pendingImportDuplicateOrders.length > 0) {
        showDuplicateOrdersModal_();
      } else {
        state.pendingImportDuplicateMode = 'APPEND';
        renderPreviewRows_();
        renderUploadPreviewInfo_();

        setMessage_(
          'uploadMessage',
          'Vista previa generada. No se detectaron órdenes duplicadas.',
          'success'
        );
      }

    } catch (err) {
      hideAppModal_();
      state.pendingImportTempId = '';
      state.pendingImportPreviewRows = [];
      state.pendingImportDuplicateOrders = [];
      state.pendingImportTotalRows = 0;
      state.pendingImportDuplicateMode = '';

      setHTML_('uploadPreviewHead', '');
      setHTML_('uploadPreviewBody', '<tr><td>Error procesando archivo.</td></tr>');
      setMessage_('uploadPreviewInfo', '');
      setMessage_('uploadMessage', err.message || 'Error procesando archivo Excel.', 'error');
    }
  };

  reader.readAsDataURL(file);
}
function showDuplicateOrdersModal_() {
  var modal = document.getElementById('duplicateOrdersModal');
  var body = document.getElementById('duplicateOrdersBody');

  if (!modal || !body) return;

  var rows = state.pendingImportDuplicateOrders || [];

  body.innerHTML = rows.length ? `
    <p>Se detectaron órdenes que ya existen en la base de datos.</p>
    <p>Seleccione cómo desea tratarlas. La vista previa mostrará exactamente lo que se procesará al guardar.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Orden</th>
            <th>Líneas en archivo</th>
            <th>Líneas actuales</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(function (r) {
            return `
              <tr>
                <td>${esc_(r.orden || '')}</td>
                <td>${esc_(r.incomingLines || 0)}</td>
                <td>${esc_(r.existingLines || 0)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  ` : '<p>No se detectaron órdenes duplicadas.</p>';

  modal.classList.remove('hidden');
}

function closeDuplicateOrdersModal_() {
  toggleHidden_('duplicateOrdersModal', true);
}

function applyDuplicateImportMode_(mode) {
  state.pendingImportDuplicateMode = mode;
  closeDuplicateOrdersModal_();
  renderPreviewRows_();
  renderUploadPreviewInfo_();

  if (mode === 'APPEND') {
    setMessage_(
      'uploadMessage',
      'Se incluirán las órdenes duplicadas y se intentará agregar solo líneas nuevas.',
      'info'
    );
  } else {
    setMessage_(
      'uploadMessage',
      'Se excluirán de la carga todas las filas de órdenes duplicadas.',
      'info'
    );
  }
}

function hydrateCaptureRowFromServer_(row) {
  return {
    tagIdPaleta: row.tagIdPaleta || '',
    scan: row.scan || '',
    codigo: row.codigo || '',
    cantidad: row.cantidad || '',
    lote: row.lote || '',
    esPriorizado: row.esPriorizado || 'NO',
    resultado: row.resultado || '',
    _scanTimer: null,
    _resolving: false,
    _lastResolvedScan: String(row.scan || '').trim()
  };
}

function renderUploadPreviewInfo_() {
  var rows = state.pendingImportPreviewRows || [];
  var mode = state.pendingImportDuplicateMode || 'APPEND';
  var processCount = 0;
  var skipCount = 0;
  var duplicateOrders = {};

  rows.forEach(function (r) {
    var isDuplicate = !!r.esOrdenDuplicada;

    if (isDuplicate) {
      duplicateOrders[r.orden] = true;
    }

    var process = !isDuplicate || mode === 'APPEND';

    if (process) processCount++;
    else skipCount++;
  });

  setMessage_(
    'uploadPreviewInfo',
    'Total filas: ' + rows.length +
    ' | Filas a procesar: ' + processCount +
    ' | Filas excluidas: ' + skipCount +
    ' | Órdenes duplicadas: ' + Object.keys(duplicateOrders).length,
    'info'
  );
}

async function guardarPlantillaPendiente_() {
  if (!state.pendingImportTempId) {
    setMessage_('uploadMessage', 'Primero genere la vista previa del archivo.', 'error');
    return;
  }

  if (state.pendingImportDuplicateOrders.length > 0 && !state.pendingImportDuplicateMode) {
    setMessage_('uploadMessage', 'Debe seleccionar cómo tratar las órdenes duplicadas.', 'error');
    return;
  }

  try {
    showAppModal_('Guardando plantilla...', true);

    var res = await apiImportarPlantillaTemporal(
      state.session.token,
      state.pendingImportTempId,
      state.pendingImportDuplicateMode || 'APPEND'
    );

    hideAppModal_();

    setMessage_(
      'uploadMessage',
      res.message +
      ' Nuevas líneas: ' + res.inserted +
      ' | Órdenes nuevas: ' + res.createdOrders +
      ' | Órdenes existentes actualizadas: ' + res.updated +
      ' | Filas omitidas: ' + res.skippedRows,
      'success'
    );

    state.pendingImportTempId = '';
    state.pendingImportPreviewRows = [];
    state.pendingImportDuplicateOrders = [];
    state.pendingImportDuplicateMode = '';
    state.pendingImportTotalRows = 0;

    setValue_('filePlantilla', '');
    setMessage_('uploadPreviewInfo', '');
    setHTML_('uploadPreviewHead', '');
    setHTML_('uploadPreviewBody', '');

    await loadAdminOrders_();
    showView_('view-admin-dashboard');

  } catch (err) {
    hideAppModal_();
    setMessage_('uploadMessage', err.message || 'Error importando plantilla.', 'error');
  }
}

function renderPreviewRows_() {
  var rows = state.pendingImportPreviewRows || [];
  var mode = state.pendingImportDuplicateMode || 'APPEND';

  if (!rows.length) {
    setHTML_('uploadPreviewHead', '');
    setHTML_('uploadPreviewBody', '<tr><td>No se encontraron filas válidas.</td></tr>');
    return;
  }

  setHTML_(
    'uploadPreviewHead',
    '<tr>' +
      '<th>Procesar</th>' +
      '<th>Observación</th>' +
      '<th>Grupo</th>' +
      '<th>Orden</th>' +
      '<th>SKU</th>' +
      '<th>Lote</th>' +
      '<th>FV</th>' +
      '<th>Descripción</th>' +
      '<th>Cantidad</th>' +
      '<th>EAN13</th>' +
      '<th>Inner</th>' +
      '<th>Valor Inner</th>' +
      '<th>EAN14</th>' +
      '<th>Valor EAN14</th>' +
      '<th>Cantidad EAN14</th>' +
      '<th>Cantidad EAN13 o SKU</th>' +
    '</tr>'
  );

  var previewRows = rows.map(function (r) {
    var isDuplicate = !!r.esOrdenDuplicada;
    var process = !isDuplicate || mode === 'APPEND';

    var observacion = 'ORDEN NUEVA';
    if (isDuplicate && mode === 'APPEND') {
      observacion = 'ORDEN EXISTENTE: SE AGREGARÁN SOLO LÍNEAS NUEVAS';
    } else if (isDuplicate && mode === 'SKIP') {
      observacion = 'ORDEN DUPLICADA: SE EXCLUIRÁ';
    }

    return `
      <tr class="${process ? '' : 'row-noconforme'}">
        <td>${process ? 'SI' : 'NO'}</td>
        <td>${esc_(observacion)}</td>
        <td>${esc_(r.grupo)}</td>
        <td>${esc_(r.orden)}</td>
        <td>${esc_(r.sku)}</td>
        <td>${esc_(r.lote)}</td>
        <td>${esc_(r.fv)}</td>
        <td>${esc_(r.descripcion)}</td>
        <td>${esc_(r.cantidad)}</td>
        <td>${esc_(r.ean13)}</td>
        <td>${esc_(r.inner)}</td>
        <td>${esc_(r.valorInner)}</td>
        <td>${esc_(r.ean14)}</td>
        <td>${esc_(r.valorEan14)}</td>
        <td>${esc_(r.cantidadEan14Preview)}</td>
        <td>${esc_(r.cantidadEan13SkuPreview)}</td>
      </tr>
    `;
  }).join('');

  setHTML_('uploadPreviewBody', previewRows);
}

function splitLine_(line) {
  if (line.indexOf(';') > -1) return line.split(';');
  if (line.indexOf('	') > -1) return line.split('	');
  return line.split(',');
}

function showView_(id) {
  var views = document.querySelectorAll('.view');
  views.forEach(function (v) {
    v.classList.add('hidden');
  });

  var target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
  }

  if (id === 'view-login') {
    document.body.classList.add('login-background');
  } else {
    document.body.classList.remove('login-background');
  }
}

function statusBadge_(status) {
  var s = normalizeText_(status);
  var cls = 'badge-pendiente';

  if (s === 'EN PROGRESO') cls = 'badge-progreso';
  else if (s === 'CONFORME' || s === 'REGISTRADO') cls = 'badge-conforme';
  else if (s === 'NO CONFORME' || s === 'REVISAR' || s === 'FALTA LOTE' || s === 'LOTE REQUERIDO') cls = 'badge-noconforme';

  return '<span class="badge ' + cls + '">' + esc_(status || '') + '</span>';
}

function rowStatusClass_(status) {
  var s = normalizeText_(status);
  if (s === 'EN PROGRESO') return 'row-progreso';
  if (s === 'CONFORME' || s === 'REGISTRADO') return 'row-conforme';
  if (s === 'NO CONFORME' || s === 'REVISAR' || s === 'FALTA LOTE' || s === 'LOTE REQUERIDO') return 'row-noconforme';
  return 'row-pendiente';
}

function priorizadoClass_(flag) {
  return normalizeText_(flag) === 'SI' ? 'row-priorizado' : '';
}

function toIsoDate_(value) {
  var v = String(value || '').trim();
  var m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  var dd = m[1].padStart(2, '0');
  var mm = m[2].padStart(2, '0');
  var yyyy = m[3];
  return yyyy + '-' + mm + '-' + dd;
}

function normalizeText_(value) {
  return String(value || '').trim().toUpperCase();
}

function on_(id, eventName, handler) {
  var el = document.getElementById(id);
  if (el) el.addEventListener(eventName, handler);
}

function value_(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function setValue_(id, value) {
  var el = document.getElementById(id);
  if (el) el.value = value;
}

function setText_(id, text) {
  var el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

function setHTML_(id, html) {
  var el = document.getElementById(id);
  if (el) el.innerHTML = html || '';
}

function clearHTML_(id) {
  setHTML_(id, '');
}

function focus_(id) {
  var el = document.getElementById(id);
  if (el) el.focus();
}

function toggleHidden_(id, hidden) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('hidden', !!hidden);
}
function showAppModal_(message, loading) {
  var modal = document.getElementById('appModal');
  var msg = document.getElementById('appModalMessage');
  var spinner = document.getElementById('appModalSpinner');

  if (!modal || !msg || !spinner) return;

  msg.textContent = message || 'Procesando...';
  spinner.classList.toggle('hidden', !loading);
  modal.classList.remove('hidden');
}

function hideAppModal_() {
  var modal = document.getElementById('appModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}
function showConfirmModal_(message, actionFn) {
  var modal = document.getElementById('confirmModal');
  var msg = document.getElementById('confirmModalMessage');

  if (!modal || !msg) return;

  msg.textContent = message || '¿Confirma la acción?';
  state.confirmAction = actionFn || null;
  modal.classList.remove('hidden');
}

function closeConfirmModal_() {
  var modal = document.getElementById('confirmModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  state.confirmAction = null;
}

async function executeConfirmModalAction_() {
  if (typeof state.confirmAction !== 'function') {
    closeConfirmModal_();
    return;
  }

  var action = state.confirmAction;
  closeConfirmModal_();
  await action();
}

function setMessage_(id, text, type) {
  var el = document.getElementById(id);
  if (!el) return;

  el.textContent = text || '';
  el.className = 'message';

  if (type === 'success') el.classList.add('success');
  if (type === 'error') el.classList.add('error');
  if (type === 'info') el.classList.add('info');
}

function esc_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#39;');
}

function escAttr_(value) {
  return esc_(value);
}
function buildEmptyCaptureRow_() {
  return {
    tagIdPaleta: '',
    scan: '',
    codigo: '',
    cantidad: '',
    lote: '',
    esPriorizado: 'NO',
    resultado: '',
    _scanTimer: null,
    _resolving: false,
    _lastResolvedScan: ''
  };
}

function addCaptureRow_() {
  state.captureRows.push(buildEmptyCaptureRow_());
  renderCaptureGrid_();
}

function removeCaptureRow_(index) {
  if (isNaN(index)) return;
  state.captureRows.splice(index, 1);

  if (!state.captureRows.length) {
    state.captureRows.push(buildEmptyCaptureRow_());
  }

  renderCaptureGrid_();
}

function renderCaptureGrid_() {
  var tbody = document.getElementById('captureGridBody');
  if (!tbody) return;

  tbody.innerHTML = state.captureRows.map(function (row, index) {
    var rowClass = normalizeText_(row.esPriorizado) === 'SI' ? 'row-priorizado' : '';

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>
          <input
            type="text"
            class="capture-tag-input"
            data-field="tagIdPaleta"
            data-index="${index}"
            value="${escAttr_(row.tagIdPaleta || '')}"
          >
        </td>
        <td>
          <input
            type="text"
            class="capture-scan-input"
            data-field="scan"
            data-index="${index}"
            value="${escAttr_(row.scan || '')}"
          >
        </td>
        <td>${esc_(row.codigo || '')}</td>
        <td>
          <input
            type="text"
            inputmode="numeric"
            class="capture-cantidad-input"
            data-field="cantidad"
            data-index="${index}"
            value="${escAttr_(row.cantidad || '')}"
          >
        </td>
        <td>
          <input
            type="text"
            class="capture-lote-input"
            data-field="lote"
            data-index="${index}"
            value="${escAttr_(row.lote || '')}"
          >
        </td>
        <td>
          <button class="btn btn-danger js-remove-capture-row" type="button" data-index="${index}">X</button>
        </td>
      </tr>
    `;
  }).join('');
}

function handleCaptureGridInput_(e) {
  var input = e.target;
  var index = Number(input.dataset.index);
  var field = input.dataset.field;

  if (isNaN(index) || !field || !state.captureRows[index]) return;

  if (field === 'cantidad') {
    state.captureRows[index][field] = String(input.value || '').replace(/[^\d.]/g, '');
  } else {
    state.captureRows[index][field] = String(input.value || '');
  }

  if (field === 'scan') {
    state.captureRows[index].codigo = '';
    state.captureRows[index].esPriorizado = 'NO';
    state.captureRows[index].resultado = '';
    state.captureRows[index]._lastResolvedScan = '';
    clearTimeout(state.captureRows[index]._scanTimer);
  }
}

async function handleCaptureGridKeydown_(e) {
  var input = e.target;
  if (!input.classList.contains('capture-scan-input')) return;

  if (e.key !== 'Enter') return;

  e.preventDefault();

  var index = Number(input.dataset.index);
  if (isNaN(index) || !state.captureRows[index]) return;

  clearTimeout(state.captureRows[index]._scanTimer);
  await resolveCaptureRowCode_(index);
}

function handleCaptureGridFocusOut_(e) {
  var input = e.target;
  if (!input.classList.contains('capture-scan-input')) return;

  var index = Number(input.dataset.index);
  if (isNaN(index) || !state.captureRows[index]) return;

  var row = state.captureRows[index];
  var currentScan = String(row.scan || '').trim();

  if (!currentScan) return;
  if (row._resolving) return;
  if (row._lastResolvedScan === currentScan) return;

  resolveCaptureRowCode_(index);
}

async function resolveCaptureRowCode_(index) {
  var row = state.captureRows[index];
  if (!row || !row.scan || !state.currentAuditorOrder || !state.currentAuditorOrder.header) return;

  row.scan = String(row.scan || '').trim();
  if (!row.scan) return;
  if (row._resolving) return;

  row._resolving = true;

  try {
    var res = await apiBuscarProducto(state.session.token, {
      orden: state.currentAuditorOrder.header.orden,
      scan: row.scan
    });

    if (!res.found) {
      row.codigo = '';
      row.esPriorizado = 'NO';
      row.resultado = 'NO ENCONTRADO';
      row._lastResolvedScan = row.scan;
      renderCaptureGrid_();
      return;
    }

    row.codigo = res.item.codigo || '';
    row.esPriorizado = res.item.priorizado || 'NO';
    row.resultado = row.esPriorizado === 'SI' ? 'LOTE REQUERIDO' : 'OK';
    row._lastResolvedScan = row.scan;

    renderCaptureGrid_();

    if (row.esPriorizado === 'SI') {
      focusCaptureField_(index, 'lote');
    }

  } catch (err) {
    row.codigo = '';
    row.esPriorizado = 'NO';
    row.resultado = err.message || 'ERROR';
    renderCaptureGrid_();
  } finally {
    row._resolving = false;
  }
}

function focusCaptureField_(index, field) {
  var selector = '';

  if (field === 'scan') {
    selector = '.capture-scan-input[data-index="' + index + '"]';
  } else if (field === 'cantidad') {
    selector = '.capture-cantidad-input[data-index="' + index + '"]';
  } else if (field === 'lote') {
    selector = '.capture-lote-input[data-index="' + index + '"]';
  } else if (field === 'tagIdPaleta') {
    selector = '.capture-tag-input[data-index="' + index + '"]';
  }

  if (!selector) return;

  var el = document.querySelector(selector);
  if (el) {
    el.focus();
    el.select();
  }
}

async function saveCaptureRows_() {
  if (!state.currentAuditorOrder || !state.currentAuditorOrder.header) {
    setMessage_('captureMessage', 'Primero debe abrir una orden.', 'error');
    return;
  }

  var rows = state.captureRows.filter(function (r) {
    return String(r.scan || '').trim() !== '';
  });

  if (!rows.length) {
    setMessage_('captureMessage', 'Debe ingresar al menos una fila.', 'error');
    return;
  }

  for (var i = 0; i < rows.length; i++) {
    if (normalizeText_(rows[i].esPriorizado) === 'SI' && !String(rows[i].lote || '').trim()) {
      setMessage_('captureMessage', 'Toda fila priorizada debe registrar lote.', 'error');
      return;
    }
  }

  var comentarioGlobal = value_('captureComentarioGlobal');

  try {
    showAppModal_('Registrando...', true);

    for (var j = 0; j < rows.length; j++) {
      await apiRegistrarAuditoria(state.session.token, {
        orden: state.currentAuditorOrder.header.orden,
        nroConteo: state.currentAuditorOrder.header.conteoActual || '1',
        tagIdPaleta: rows[j].tagIdPaleta,
        scan: rows[j].scan,
        cantidadAuditada: Number(rows[j].cantidad || 1),
        loteAuditado: rows[j].lote,
        comentario: comentarioGlobal
      });
    }

    var cierre = await apiCerrarConteoOrden(
      state.session.token,
      state.currentAuditorOrder.header.orden,
      comentarioGlobal
    );

    state.captureRows = [buildEmptyCaptureRow_()];
    setValue_('captureComentarioGlobal', '');
    clearHTML_('captureGridBody');

    await loadAuditorOrders_();

    showAppModal_(
      'Pedido guardado correctamente. Estado: ' + (cierre.estadoVisual || ''),
      false
    );

    setTimeout(function () {
      hideAppModal_();
      showView_('view-auditor-dashboard');
    }, 1400);

  } catch (err) {
    hideAppModal_();
    setMessage_('captureMessage', err.message || 'Error guardando pedido.', 'error');
  }
}
async function handleDescargarRegistroVerificacion_() {
  if (!state.session || state.session.rol !== 'ADMIN') {
    alert('Acceso denegado.');
    return;
  }

  try {
    showAppModal_('Generando archivo...', true);

    var res = await apiExportarRegistroVerificacion(state.session.token);

    hideAppModal_();

    if (res.downloadUrl) {
      window.open(res.downloadUrl, '_blank');
      return;
    }

    if (res.fileUrl) {
      window.open(res.fileUrl, '_blank');
      return;
    }

    alert('No se recibió la URL de descarga.');
  } catch (err) {
    hideAppModal_();
    alert(err.message || 'Error generando el archivo.');
  }
}



