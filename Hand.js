class Hand {
    constructor(type = 'custom') {
        this.type = type; // 'segundero', 'minutero', 'horario', o 'custom'
        this.shaft = null; // Se llenará cuando se monte en un eje
        
        // Nombre por defecto basado en el tipo
        this.name = type.charAt(0).toUpperCase() + type.slice(1);

        // --- PRESETS DE DISEÑO ---
        // Estos valores replican exactamente las agujas que ya dibujabas en el Renderer
        switch(type) {
            case 'segundero':
                this.color = [200, 0, 0];   // Rojo
                this.strokeW = 1.5;
                this.length = 48;
                this.tailLength = 8;         // Contrapeso hacia atrás
                break;
            case 'minutero':
                this.color = [0, 0, 200];   // Azul
                this.strokeW = 4;
                this.length = 42;
                this.tailLength = 0;
                break;
            case 'horario':
                this.color = [0, 150, 0];   // Verde
                this.strokeW = 6;
                this.length = 28;
                this.tailLength = 0;
                break;
            default: // 'custom'
                this.color = [50, 50, 50];  // Gris genérico
                this.strokeW = 3;
                this.length = 35;
                this.tailLength = 0;
                break;
        }
    }
}