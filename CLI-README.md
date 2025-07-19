# 🏠 AC Controller IR Configuration CLI

Un asistente interactivo para configurar códigos IR de aire acondicionado de manera fácil y guiada.

## 🚀 Uso

### Producción (recomendado)
```bash
# 1. Compilar el proyecto
npm run build

# 2. Ejecutar el CLI
npm run config
```

### Desarrollo
```bash
# Ejecutar directamente con ts-node
npm run config:dev
```

## 📋 Funcionalidades

### 1. **Grabar código IR**
- Selecciona el dispositivo AC
- Configura el estado objetivo (modo, ventilador, temperatura)
- Graba el código IR automáticamente
- Guarda en la configuración

### 2. **Listar dispositivos**
- Muestra todos los dispositivos disponibles
- Información de modos soportados

### 3. **Recargar configuración**
- Recarga los cambios del archivo de configuración

## 🎯 Proceso de grabación

1. **Seleccionar dispositivo**: Elige el AC de la lista
2. **Configurar estado**:
   - **Modo**: Auto, Cool, Heat, Dry, Fan Only, Off
   - **Ventilador**: Auto, Low, Medium, High, Quiet
   - **Temperatura**: 16-30°C
3. **Grabar código**:
   - Apunta el control remoto al receptor IR
   - Presiona el botón con la configuración especificada
   - El sistema captura automáticamente el código
4. **Guardar**: Confirma para guardar en la configuración

## 🔧 Casos especiales

- **Modo "Off"**: Solo necesita el modo, salta ventilador y temperatura
- **Modo "Fan Only"**: Solo necesita modo y ventilador, salta temperatura
- **Otros modos**: Necesita modo, ventilador y temperatura

## 📁 Estructura de archivos

```
src/
├── cli/
│   ├── IRConfigurationCLI.ts      # Interfaz CLI interactiva
│   └── config-cli.ts              # Punto de entrada CLI
├── services/
│   ├── IRConfigurationManager.ts  # Lógica de negocio
│   └── IRConfigurationService.ts  # Servicio para app principal
```

## 🛠️ Configuración

Asegúrate de tener:
- ✅ MQTT broker funcionando
- ✅ Archivo `data/devices.json` configurado
- ✅ Dispositivo IR ZS06 conectado

## 🎨 Ejemplo de uso

```bash
$ npm run build
$ npm run config

🏠 AC Controller IR Configuration Assistant
This tool will help you record IR codes for your AC devices.

? What would you like to do?
❯ 📱 Record IR code for device
  📋 List available devices
  🔄 Reload configuration
  🚪 Exit

? Select AC device:
❯ Living Room AC (living_room) - Modes: auto, cool, heat, dry, fan_only, off
  Bedroom AC (bedroom) - Modes: auto, cool, heat, dry, off

? Select AC mode:
❯ ❄️ Cool
  🔥 Heat
  🔄 Auto
  💨 Dry
  🌪️ Fan Only
  ⚫ Off

? Select fan mode:
❯ 🔄 Auto
  🌬️ Low
  💨 Medium
  🌪️ High
  🤫 Quiet

? Enter target temperature (16-30°C): 24

📋 Target State:
   Power: ON
   Mode: cool
   Fan: auto
   Temperature: 24°C

📡 IR learning mode enabled for device: ir_blaster_01
? Point your AC remote at the IR receiver and press ENTER when ready to record (Y/n)

🎯 Recording... Point your remote and press the button with the above settings!
⏳ Waiting for IR code (30 seconds timeout)...
✅ IR code captured! (1234 characters)
? Save this IR code? (Y/n)
💾 IR code saved successfully!
```

## 💡 Consejos

- Mantén el control remoto cerca del receptor IR
- Usa la configuración exacta mostrada en "Target State"
- Si falla la grabación, intenta de nuevo
- Puedes grabar múltiples combinaciones para el mismo dispositivo