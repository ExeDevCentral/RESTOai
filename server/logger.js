// Logger Estructurado para Observabilidad, Agentes IA y Depuración
// Tags canónicas: [API], [DATABASE], [PAYMENT], [FISCAL], [PRINT], [AI], [MCP], [ERROR]

const recentLogs = [];
const MAX_LOG_HISTORY = 100;

function formatTimestamp() {
  return new Date().toISOString();
}

function pushLog(tag, level, message, metadata) {
  const entry = {
    timestamp: formatTimestamp(),
    tag,
    level,
    message,
    metadata: metadata || null
  };
  recentLogs.push(entry);
  if (recentLogs.length > MAX_LOG_HISTORY) {
    recentLogs.shift();
  }
  return entry;
}

export const logger = {
  api(message, metadata) {
    pushLog('[API]', 'INFO', message, metadata);
    console.log(`[API] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  database(message, metadata) {
    pushLog('[DATABASE]', 'INFO', message, metadata);
    console.log(`[DATABASE] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  payment(message, metadata) {
    pushLog('[PAYMENT]', 'INFO', message, metadata);
    console.log(`[PAYMENT] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  fiscal(message, metadata) {
    pushLog('[FISCAL]', 'INFO', message, metadata);
    console.log(`[FISCAL] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  print(message, metadata) {
    pushLog('[PRINT]', 'INFO', message, metadata);
    console.log(`[PRINT] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  ai(message, metadata) {
    pushLog('[AI]', 'INFO', message, metadata);
    console.log(`[AI] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  mcp(message, metadata) {
    pushLog('[MCP]', 'INFO', message, metadata);
    console.log(`[MCP] ${message}`, metadata ? JSON.stringify(metadata) : '');
  },
  error(tag, message, error) {
    const errorDetails = error ? { error: error.message || String(error), stack: error.stack } : null;
    pushLog(tag || '[ERROR]', 'ERROR', message, errorDetails);
    console.error(`${tag || '[ERROR]'} ${message}`, errorDetails || '');
  },
  getRecentLogs(filterTag) {
    if (!filterTag) return [...recentLogs];
    return recentLogs.filter(l => l.tag === filterTag);
  }
};
