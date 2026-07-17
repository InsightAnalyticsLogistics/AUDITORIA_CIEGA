const API_URL = 'https://script.google.com/macros/s/AKfycbyUmDWViQoEu1D8DD6l1HB9ZQTY8Ez23HJwhfPFVZZHtZoKO7KGLctOympoYsgW8ggJ/exec';

async function apiRequest(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify({ action, payload })
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Respuesta inválida del backend.');
  }

  if (!data.ok) {
    throw new Error(data.message || 'Error en la API.');
  }

  return data;
}

function apiLogin(usuario, clave) {
  return apiRequest('login', { usuario, clave });
}

function apiGetSesion(token) {
  return apiRequest('getSesion', { token });
}

function apiLogout(token) {
  return apiRequest('logout', { token });
}

function apiBuscarProducto(token, data) {
  return apiRequest('buscarProducto', { token, scan: data });
}

function apiRegistrarAuditoria(token, data) {
  return apiRequest('registrarAuditoria', { token, data });
}

function apiCerrarConteoOrden(token, orden, comentarioGlobal) {
  return apiRequest('cerrarConteoOrden', { token, orden, comentarioGlobal });
}

function apiListarUsuarios(token) {
  return apiRequest('listarUsuarios', { token });
}

function apiGuardarUsuario(token, data) {
  return apiRequest('guardarUsuario', { token, data });
}

function apiListarPriorizados(token) {
  return apiRequest('listarPriorizados', { token });
}

function apiGuardarPriorizados(token, codigos) {
  return apiRequest('guardarPriorizados', { token, codigos });
}

function apiListarAuditoria(token, limite = 100) {
  return apiRequest('listarAuditoria', { token, limite });
}

function apiLimpiarAuditoria(token) {
  return apiRequest('limpiarAuditoria', { token });
}

function apiListarOrdenesAdmin_(token) {
  return apiRequest('listarOrdenesAdmin', { token });
}

function apiListarOrdenesAuditor(token) {
  return apiRequest('listarOrdenesAuditor', { token });
}

function apiObtenerDetalleOrdenAdmin_(token, orden) {
  return apiRequest('obtenerDetalleOrdenAdmin', { token, orden });
}

function apiAbrirOrdenAuditor(token, orden) {
  return apiRequest('abrirOrdenAuditor', { token, orden });
}

function apiAbrirSegundoConteo(token, orden) {
  return apiRequest('abrirSegundoConteo', { token, orden });
}

function apiAbrirTercerConteo(token, orden) {
  return apiRequest('abrirTercerConteo', { token, orden });
}

function apiEliminarOrdenAdmin_(token, orden) {
  return apiRequest('eliminarOrdenAdmin', { token, orden });
}

function apiPreviewPlantillaExcel(token, fileName, base64) {
  return apiRequest('previewPlantillaExcel', { token, fileName, base64 });
}

function apiImportarPlantillaTemporal(token, tempSpreadsheetId, duplicateMode) {
  return apiRequest('importarPlantillaTemporal', {
    token,
    tempSpreadsheetId,
    duplicateMode
  });
}

function apiReiniciarOrdenAdmin_(token, orden) {
  return apiRequest('reiniciarOrdenAdmin', { token, orden });
}
