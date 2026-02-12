# OTUI Editor - OTClient Redemption (OTCR) Standard Compliance

## 📋 Recent Updates

This editor now follows the **official OTClient Redemption OTUI specification** as the absolute standard.

### ✅ OTCR Features Implemented

#### 1. **Special Directives**
- `!text: tr('string')` - Translatable text directive (recommended over `text:`)
- Parser preserves `!` prefix during import/export
- Serializer outputs `!text:` when `__i18n.text` metadata is set

#### 2. **Event Handlers**
- `@onClick:` - Click event handler
- `@onEscape:` - Escape key handler
- `@onOpen:` - Window open event
- `@onClose:` - Window close event
- **Inline functions supported**:
  ```otui
  @onClick: |
    function(self)
      print("clicked")
    end
  ```

#### 3. **Pseudo-States**
- `$hover:` - Hover state
- `$pressed:` - Pressed state
- `$disabled:` - Disabled state
- `$checked:` - Checked state (checkboxes)
- `$on:` / `$!on:` - Toggle states

Example:
```otui
Button < UIButton
  background-color: #333
  $hover:
    background-color: #555
  $pressed:
    background-color: #111
```

#### 4. **Layout Properties**
- `layout.type:` - verticalBox, horizontalBox, grid
- `layout.spacing:` - Spacing between items
- `layout.fit-children:` - Auto-resize to fit children
- `layout.cell-size:` - Grid cell dimensions
- `layout.cell-spacing:` - Grid cell spacing
- `layout.flow:` - Flow layout

Example:
```otui
Panel < UIPanel
  layout:
    type: verticalBox
    spacing: 5
    fit-children: true
```

#### 5. **UIProgressBar Standard**
- **NEVER use `percent`** - use `value`, `minimum`, `maximum` instead
- Auto-fix converts `percent` to proper OTCR format
- Validator warns if `percent` is used

✅ Correct:
```otui
HealthBar < UIProgressBar
  value: 75
  minimum: 0
  maximum: 100
```

❌ Incorrect (legacy):
```otui
HealthBar < UIProgressBar
  percent: 75  # DEPRECATED
```

#### 6. **Complete Widget Type Support**
All official OTCR widgets are now supported:

- **Containers**: UIWidget, UIPanel, UIMiniWindow, MiniWindow, MiniWindowContents, UIScrollArea, UIScrollBar, UIScrollPanel
- **Text**: UILabel, Label, UITextEdit, TextEdit
- **Buttons**: UIButton, Button, UICheckBox, CheckBox, UIRadioGroup
- **Images**: UIImage, UIItem, UICreature
- **Bars**: UIProgressBar
- **Game**: UIGameMap

### 🔧 Parser/Serializer Improvements

1. **Preserves special prefixes**: `!text:`, `@onClick:`, `$hover:` are now preserved during import/export
2. **State blocks**: Properly parses and serializes indented state properties
3. **Inline events**: Multi-line Lua functions are captured and restored correctly
4. **Layout blocks**: Nested layout properties maintain proper indentation
5. **Professional formatting**: Properties are ordered logically (size → colors → anchors → margins)

### 📖 OTUI Standard Reference

A new **"OTUI Standard"** button has been added to the toolbar. Click it to view:
- Complete OTCR syntax rules
- Directive examples
- State modifier examples
- Layout system documentation
- Official widget types
- Critical rules and best practices
- Complete working examples

### 📁 New Files

- **`src/lib/otui-standard.ts`** - Complete OTCR specification reference
- **`src/components/editor/OTUIStandardReference.tsx`** - Interactive reference modal
- **`test-otcr-standard.otui`** - Comprehensive OTCR test file

### 🎯 Validation Updates

The validator now recognizes:
- OTCR directives (`!text:`) as valid
- Event handlers (`@onClick:`) as valid
- State properties (`$hover.color`) as valid
- Layout properties (`layout.spacing`) as valid
- Recommends `!text: tr()` over plain `text:`

### ⚡ Auto-Fix Features

1. **Multiple root widgets**: Automatically wraps in `MainContainer < UIPanel`
2. **UIProgressBar**: Converts `percent` to `value/minimum/maximum`
3. **Text directive**: Can convert `text:` to `!text: tr()`
4. **Border properties**: Auto-adds `border-width: 1` when `border-color` exists

### 🚀 How to Use

#### Import OTCR Files
1. Click **Import** button
2. Select `.otui` file
3. Parser automatically detects and preserves all OTCR features
4. Auto-fix suggests improvements (if needed)

#### Export OTCR Files
1. Click **Export** button
2. File is generated with:
   - `!text:` directives (if widget uses translations)
   - `@event:` handlers
   - `$state:` blocks with proper indentation
   - `layout:` blocks
   - Professional property ordering
   - OTCR-compliant syntax

#### View OTCR Standard
1. Click **OTUI Standard** button (book icon)
2. Browse tabs:
   - **Syntax**: Basic OTUI syntax and anchors
   - **Directives**: !text: and @events
   - **States**: $hover, $pressed, etc.
   - **Layout**: Automatic layout system
   - **Widgets**: All official types and rules

### 📝 Example OTUI (OTCR Standard)

```otui
MainWindow < UIMiniWindow
  size: 400 300
  !text: tr('Main Window')
  @onEscape: hide()
  
  Panel < UIPanel
    anchors.fill: parent
    padding: 10
    background-color: #1a1a1a
    
    TitleLabel < UILabel
      !text: tr('Welcome')
      anchors.top: parent.top
      anchors.horizontalCenter: parent.horizontalCenter
      color: #ffffff
    
    HoverButton < UIButton
      size: 150 30
      !text: tr('Hover Me')
      anchors.top: TitleLabel.bottom
      margin-top: 10
      background-color: #3a5a7f
      $hover:
        background-color: #4a6a9f
      $pressed:
        background-color: #2a4a6f
    
    Container < UIPanel
      size: 350 100
      anchors.top: HoverButton.bottom
      margin-top: 15
      layout:
        type: verticalBox
        spacing: 5
        fit-children: true
      
      Label1 < UILabel
        !text: tr('Item 1')
        height: 20
      
      Label2 < UILabel
        !text: tr('Item 2')
        height: 20
    
    ActionButton < UIButton
      size: 120 30
      !text: tr('Click Me')
      anchors.bottom: parent.bottom
      @onClick: |
        function(self)
          print("Button clicked!")
        end
```

### 🔑 Key Rules

1. ✅ **Use !text: tr('string')** for all user-facing text
2. ✅ **Use anchors** instead of x/y when possible
3. ✅ **Use value/minimum/maximum** in UIProgressBar (NEVER percent)
4. ✅ **Use layout properties** for automatic positioning
5. ✅ **Use states** ($hover, $pressed) for interactive feedback
6. ❌ **NEVER execute functions** inside OTUI
7. ❌ **NEVER mix** HTML/CSS with OTUI
8. ❌ **NEVER export** __virtual_root__

### 🎨 Visual Improvements

- State properties appear in properties panel
- Event handlers are preserved
- Layout block properties grouped together
- Better property ordering in exported files
- Professional indentation

---

**This editor is now fully compliant with OTClient Redemption OTUI specification.**
