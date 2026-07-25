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
    
    // Crear escape según tipo
    static create(type, pendulum, escapeGear, system) {
        switch(type) {
            case this.TYPES.SWISS:
                return new SwissLeverEscapement(pendulum, escapeGear, system);
            case this.TYPES.CYLINDER:
                return new CylinderEscapement(pendulum, escapeGear, system);
            case this.TYPES.DETENT:
                return new DetentEscapement(pendulum, escapeGear, system);
            case this.TYPES.VERGE:
                return new VergeEscapement(pendulum, escapeGear, system);
            default:
                console.warn("Tipo de escape no reconocido, usando Swiss por defecto.");
                return new SwissLeverEscapement(pendulum, escapeGear, system);
        }
    }
}