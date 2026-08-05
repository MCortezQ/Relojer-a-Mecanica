// ==========================================
// ESCAPEMENT FACTORY - Fábrica de escapes
// ==========================================

class EscapementFactory {
    
    // Tipos disponibles
    static TYPES = {
        SWISS: 'swiss',
        CYLINDER: 'cylinder',
        DETENT: 'detent',
        VERGE: 'verge'
    };

    // Nombres mostrados en UI
    static TYPE_NAMES = {
        swiss: 'Suizo (Áncora)',
        cylinder: 'Cilindro',
        detent: 'Cronómetro',
        verge: 'Verge (Reculada)'
    };

    // Tipos con implementación real de doTick()/update(). 'detent' y 'verge' son
    // clases placeholder (solo el console.warn del constructor) — pendientes.
    static IMPLEMENTED_TYPES = new Set(['swiss', 'cylinder']);

    // Crear escape según tipo
    static create(type, pendulum, escapeGear, system) {
        if (!this.IMPLEMENTED_TYPES.has(type)) {
            console.warn(`⚠️ Escape tipo '${type}' aún no está implementado (solo geometría, sin física de tick). Usando Swiss por defecto.`);
            return new SwissLeverEscapement(pendulum, escapeGear, system);
        }
        switch(type) {
            case this.TYPES.SWISS:
                return new SwissLeverEscapement(pendulum, escapeGear, system);
            case this.TYPES.CYLINDER:
                return new CylinderEscapement(pendulum, escapeGear, system);
            default:
                console.warn("Tipo de escape no reconocido, usando Swiss por defecto.");
                return new SwissLeverEscapement(pendulum, escapeGear, system);
        }
    }
}