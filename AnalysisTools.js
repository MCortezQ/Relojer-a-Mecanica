class AnalysisTools {
    constructor(system) {
        this.system = system;
        this.motorPower = 1.0; // Potencia base del motor (W)
        this.frictionPerMesh = 0.97; // Eficiencia por par de engranajes (3% pérdida)
    }

    // 1. Calcular torque en un eje
    getTorqueAt(shaft) {
        let omega = Math.abs(shaft.omega);
        if (omega < 0.001) return 0;
        return this.motorPower / omega;
    }

    // 2. Calcular torque en todos los ejes
    getAllTorques() {
        let result = {};
        for (let shaft of this.system.shafts) {
            result[shaft.id] = {
                omega: shaft.omega,
                torque: this.getTorqueAt(shaft),
                isDriver: shaft.isDriver
            };
        }
        return result;
    }

    // 3. Eficiencia del tren completo
    getEfficiency() {
        let meshes = this.system.meshes.length;
        let belts = this.system.belts.length;
        let totalLinks = meshes + belts;
        
        // Cada enlace introduce pérdidas
        let efficiency = Math.pow(this.frictionPerMesh, totalLinks);
        return Math.round(efficiency * 1000) / 1000; // Redondear a 3 decimales
    }

    // 4. Detectar problemas de diseño
    getDesignIssues() {
        let issues = [];

        for (let mesh of this.system.meshes) {
            let ratio = Math.abs(mesh.ratio());
            if (ratio < 0.1 || ratio > 10) {
                issues.push({
                    type: 'extreme_ratio',
                    message: `Relación extrema: ${mesh.driver.name}(${mesh.driver.teeth}d) → ${mesh.driven.name}(${mesh.driven.teeth}d) = ${ratio.toFixed(2)}`,
                    severity: 'medium'
                });
            }
        }

        for (let gear of this.system.gears) {
            if (gear.teeth < 6) {
                issues.push({
                    type: 'too_few_teeth',
                    message: `${gear.name} tiene ${gear.teeth} dientes (muy pocos, riesgo de interferencia)`,
                    severity: 'high'
                });
            }
            if (gear.teeth > 200) {
                issues.push({
                    type: 'too_many_teeth',
                    message: `${gear.name} tiene ${gear.teeth} dientes (poco práctico)`,
                    severity: 'low'
                });
            }
        }

        // Detectar ejes sin carga (que no transmiten potencia)
        let poweredShafts = new Set();
        for (let mesh of this.system.meshes) {
            poweredShafts.add(mesh.driver.shaft);
            poweredShafts.add(mesh.driven.shaft);
        }
        for (let shaft of this.system.shafts) {
            if (!poweredShafts.has(shaft) && shaft.components.length > 0) {
                issues.push({
                    type: 'idle_shaft',
                    message: `Eje ${shaft.id} tiene componentes pero no está conectado a ningún tren`,
                    severity: 'medium'
                });
            }
        }

        if (this.system.shafts.length > 50) {
            issues.push({
                type: 'large_system',
                message: `Sistema grande (${this.system.shafts.length} ejes). Forklift puede ser lento.`,
                severity: 'low'
            });
        }      

        return issues;
    }

    // 5. Generar datos para gráfico de velocidades
    getSpeedChartData() {
        let chart = [];
        let maxOmega = 0;
        
        for (let shaft of this.system.shafts) {
            let omega = Math.abs(shaft.omega);
            if (omega > maxOmega) maxOmega = omega;
            chart.push({
                id: shaft.id,
                name: shaft.name || `Eje ${shaft.id}`,
                omega: omega,
                isDriver: shaft.isDriver,
                components: shaft.components.map(c => c.name || c.constructor.name).join(', ')
            });
        }
        
        // Normalizar (si maxOmega > 0)
        if (maxOmega > 0) {
            for (let item of chart) {
                item.normalized = item.omega / maxOmega;
            }
        }
        
        return chart;
    }

    // 6. Resumen ejecutivo del mecanismo
    getSummary() {
        let totalGears = this.system.gears.length;
        let totalMeshes = this.system.meshes.length;
        let totalBelts = this.system.belts.length;
        let totalShafts = this.system.shafts.length;
        let motor = this.system.shafts.find(s => s.isDriver);
        let issues = this.getDesignIssues();
        let efficiency = this.getEfficiency();

        return {
            components: {
                shafts: totalShafts,
                gears: totalGears,
                meshes: totalMeshes,
                belts: totalBelts
            },
            motor: motor ? {
                id: motor.id,
                omega: motor.omega,
                torque: this.getTorqueAt(motor)
            } : null,
            efficiency: efficiency,
            issues: issues,
            hasIssues: issues.length > 0
        };
    }
}