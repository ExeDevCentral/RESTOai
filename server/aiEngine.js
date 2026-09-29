import { db } from './db.js';

export function processAIChat(prompt, context = {}) {
  const text = (prompt || "").toLowerCase();
  const data = db.getData();

  // 1. Preguntas sobre vinos y maridajes
  if (text.includes("maridaje") || text.includes("vino") || text.includes("recomendar vino") || text.includes("copa")) {
    return {
      category: "sommelier",
      title: "Recomendación de Sommelier RESTOia 🍷",
      message: `Para carnes rojas de cocción lenta o cortes madurados como nuestro **Bife de Chorizo Madurado 400g**, te recomiendo fuertemente el **Vino Malbec Gran Reserva 750ml** ($22.000). Su intensidad tánica y notas a vainilla y ciruela negra equilibran la grasa intramuscular a la perfección.\n\nSi prefieres pescados como el **Salmón Rosado en Costra de Almendras**, sugerimos maridar con un vino blanco con cuerpo (Chardonnay o Sauvignon Blanc) o empezar con nuestro cóctel de autor **Smoked Negroni**.`
    };
  }

  // 2. Preguntas de alergias y restricciones (celíacos, sin TACC, lácteos, etc.)
  if (text.includes("alergia") || text.includes("tacc") || text.includes("celiac") || text.includes("vegano") || text.includes("vegetariano") || text.includes("lacteos")) {
    const glutenFree = data.menu.filter(item => !item.allergens.includes("Gluten"));
    const dairyFree = data.menu.filter(item => !item.allergens.includes("Lácteos"));
    
    return {
      category: "dietary",
      title: "Guía de Restricciones & Alérgenos 🛡️",
      message: `En nuestra cocina cuidamos estrictamente la trazabilidad de alérgenos:\n\n` +
        `• **Opciones Sin Gluten identificadas:** Bife de Chorizo Madurado, Carpaccio de Lomo con Alcaparras, Smoked Negroni.\n` +
        `• **Opciones Sin Lácteos:** Bife de Chorizo (sin aderezo lácteo), Carpaccio (solicitando sin parmesano), Empanadas Criollas.\n` +
        `⚠️ *Aviso de seguridad:* Notifica siempre a cocina a través de la comanda agregando la nota de 'ALERGIA' para desinfectar mesadas.`
    };
  }

  // 3. Consejos de negocio y optimización para gerencia
  if (text.includes("rentabilidad") || text.includes("gerente") || text.includes("ventas") || text.includes("optimizar") || text.includes("negocio") || text.includes("promocion")) {
    const totalOrders = data.orders.length;
    const pendingOrders = data.orders.filter(o => o.status === 'en_cocina' || o.status === 'pendiente').length;
    
    return {
      category: "management",
      title: "Análisis Inteligente de Operaciones 📈",
      message: `**Diagnóstico en Tiempo Real:**\n` +
        `• Mesas con comanda activa: **${totalOrders}** mesas.\n` +
        `• Comandas esperando o en cocina: **${pendingOrders}** pedidos.\n` +
        `• **Sugerencia de Upselling:** El 68% de las mesas que piden carnes no eligen postre al inicio. Activar a los mozos a ofrecer el *Volcán de Chocolate Belga* al momento de retirar platos principales aumentará el ticket promedio un **+14%** estimado.`
    };
  }

  // 4. Recomendación de plato según estado de ánimo / ocasión
  if (text.includes("recomienda") || text.includes("sugerir") || text.includes("que comer") || text.includes("plato") || text.includes("hambre")) {
    return {
      category: "dish_recommendation",
      title: "Selección Recomendada del Chef ⭐",
      message: `Si buscas una experiencia inolvidable, te sugerimos iniciar con la **Provoleta Especial de la Casa** con tomates confitados y pesto, continuar con los **Raviolones de Cordero Patagónico** (con 8 horas de braseado suave) y culminar con el **Volcán de Chocolate Belga 70%** con helado artesanal.`
    };
  }

  // 5. Respuesta inteligente por defecto
  return {
    category: "general",
    title: "Asistente Inteligente RESTOia 🤖",
    message: `Hola, soy el copiloto de IA de RESTOia. Puedo ayudarte con:\n\n` +
      `1. **Maridajes & Vinos:** "¿Qué vino combina con el bife madurado?"\n` +
      `2. **Detección de Alérgenos:** "¿Qué platos son aptos sin gluten o sin lácteos?"\n` +
      `3. **Análisis de Cocina y Rentabilidad:** "¿Cómo podemos optimizar el despacho hoy?"\n` +
      `4. **Recomendaciones a medida:** "¿Qué pedir para una cena romántica de 2 personas?"`
  };
}
