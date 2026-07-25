// ==========================================
// QUADTREE - Estructura de búsqueda espacial
// ==========================================

class Quadtree {
    constructor(bounds, capacity = 4) {
        this.bounds = bounds; // { x, y, w, h }
        this.capacity = capacity;
        this.points = [];
        this.divided = false;
        this.nw = null;
        this.ne = null;
        this.sw = null;
        this.se = null;
    }

    // Insertar un punto con datos asociados
    insert(point) {
        // Si no está dentro de los límites, ignorar
        if (!this.contains(point)) return false;
    
        // Si está dividido, insertar en el hijo correspondiente
        if (this.divided) {
            return (this.nw.insert(point) || 
                    this.ne.insert(point) || 
                    this.sw.insert(point) || 
                    this.se.insert(point));
        }
    
        // Si hay espacio, agregar aquí
        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }
    
        // Si está lleno, subdividir y reinsertar
        this.subdivide();
        return this.insert(point);
    }

    // Subdividir en 4 cuadrantes
    subdivide() {
        let x = this.bounds.x;
        let y = this.bounds.y;
        let w = this.bounds.w / 2;
        let h = this.bounds.h / 2;

        let nwBounds = { x: x, y: y, w: w, h: h };
        let neBounds = { x: x + w, y: y, w: w, h: h };
        let swBounds = { x: x, y: y + h, w: w, h: h };
        let seBounds = { x: x + w, y: y + h, w: w, h: h };

        this.nw = new Quadtree(nwBounds, this.capacity);
        this.ne = new Quadtree(neBounds, this.capacity);
        this.sw = new Quadtree(swBounds, this.capacity);
        this.se = new Quadtree(seBounds, this.capacity);
        this.divided = true;

        // Reinsertar los puntos existentes
        for (let p of this.points) {
            this.nw.insert(p) || this.ne.insert(p) || 
            this.sw.insert(p) || this.se.insert(p);
        }
        this.points = [];
    }

    // Verificar si un punto está dentro de los límites
    contains(point) {
    return (point.x >= this.bounds.x &&
            point.x < this.bounds.x + this.bounds.w &&
            point.y >= this.bounds.y &&
            point.y < this.bounds.y + this.bounds.h);
    }

    // Buscar todos los puntos en un área circular
    queryCircle(cx, cy, radius) {
        let results = [];
        let circleBounds = {
            x: cx - radius,
            y: cy - radius,
            w: radius * 2,
            h: radius * 2
        };
        this.queryRange(circleBounds, results, { cx, cy, radius });
        return results;
    }

    // Buscar todos los puntos en un área rectangular
    queryRange(rect, results = [], circle = null) {
        // Si no hay intersección, retornar vacío
        if (!this.intersects(rect)) return results;

        // Si está dividido, buscar en los hijos
        if (this.divided) {
            this.nw.queryRange(rect, results, circle);
            this.ne.queryRange(rect, results, circle);
            this.sw.queryRange(rect, results, circle);
            this.se.queryRange(rect, results, circle);
            return results;
        }

        // Si no está dividido, revisar los puntos locales
        for (let p of this.points) {
            // Si se especificó un círculo, filtrar por distancia
            if (circle) {
                let dx = p.x - circle.cx;
                let dy = p.y - circle.cy;
                if (dx * dx + dy * dy <= circle.radius * circle.radius) {
                    results.push(p);
                }
            } else {
                // Si es rectangular, verificar intersección
                if (p.x >= rect.x && p.x <= rect.x + rect.w &&
                    p.y >= rect.y && p.y <= rect.y + rect.h) {
                    results.push(p);
                }
            }
        }
        return results;
    }

    // Verificar intersección entre dos rectángulos
    intersects(rect) {
        return !(rect.x > this.bounds.x + this.bounds.w ||
                 rect.x + rect.w < this.bounds.x ||
                 rect.y > this.bounds.y + this.bounds.h ||
                 rect.y + rect.h < this.bounds.y);
    }

    // Limpiar el árbol
    clear() {
        this.points = [];
        this.divided = false;
        this.nw = null;
        this.ne = null;
        this.sw = null;
        this.se = null;
    }
}