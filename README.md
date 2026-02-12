# OTUI Designer Suite

**Visual editor for creating OTUI interfaces for OTClient Redemption**

A modern, browser-based WYSIWYG editor for designing user interfaces for OTClient (Open Tibia Client). Supports the full OTUI standard including widgets, anchors, layouts, events, state styling, and internationalization.

---

## 🎯 Features

### Visual Editor
- **Drag & Drop Interface**: Build UIs visually without writing code
- **Multi-Selection**: Select and move multiple widgets at once (Ctrl/Shift + Click)
- **Smart Alignment Guides**: Visual guides show alignment with siblings and parent edges
- **Parent-Aware Spacing**: See pixel distances to edges and center while dragging
- **Auto-Anchoring**: Hold Ctrl while dropping to auto-generate anchor properties
- **Resize Handles**: Drag handles to resize widgets visually
- **OTClient Viewport**: Visual boundary showing standard client resolution (800×600px)
- **Real-time Preview**: See exactly how your UI will render in OTClient

### OTUI Standard Support
- **All Widget Types**: Containers, labels, buttons, inputs, game widgets, and more
- **Anchors & Layouts**: Full support for parent/sibling anchoring and flex layouts  
- **State Styling**: `$hover`, `$pressed`, `$focus` pseudo-states for interactive widgets
- **Event Handlers**: `@onClick`, `@onHover`, inline Lua event blocks
- **Internationalization**: `!text` directive with `tr()` function support
- **Multi-Format Parser**: Imports OTUI from various syntax styles (angle brackets, colons, Lua-style)

### Developer Tools
- **Code Export**: Export clean, standard-compliant `.otui` files
- **Import & Parse**: Load existing `.otui` files with validation
- **Validation**: Real-time linting with OTCR standard compliance checks
- **Code Comparison**: Side-by-side view of original vs. fixed/optimized code
- **Undo/Redo**: Full history tracking with keyboard shortcuts
- **Hierarchy Tree**: Visual widget tree with drag-to-reparent
- **Properties Panel**: Edit all widget properties with smart controls

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm (install via [nvm](https://github.com/nvm-sh/nvm))
- Modern browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd otui-designer-suite

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview  # Preview production build locally
```

---

## 📖 Usage Guide

### Creating a New Interface

1. **Add Widgets**: Drag widgets from the left palette onto the canvas
2. **Arrange**: Click to select, drag to move, use Ctrl/Shift for multi-select
3. **Configure**: Edit properties in the right panel (size, colors, text, etc.)
4. **Anchor**: Hold Ctrl while dropping widgets to auto-generate anchors
5. **Preview**: Click "Client Preview" to see how it renders in OTClient
6. **Export**: Click Export → Download .otui to save your interface

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + R` | Toggle Rulers |
| `Ctrl/Shift + Click` | Multi-select widgets |
| `Shift + Drag` | Lock to horizontal/vertical axis |
| `Ctrl + Drop` | Auto-anchor to nearest edges |
| `Delete` | Remove selected widget |

### Alignment Guides

While dragging widgets, visual guides appear when:
- Widget edges align with siblings (left, right, top, bottom, center)
- Widget is near parent container edges or center
- Spacing labels show pixel distances to parent edges

**Tip**: Guides only show siblings with the same parent for cleaner hierarchy-aware alignment.

---

---

## 📁 OTUI Format Reference

### Widget Declaration Formats

The parser supports multiple formats for maximum compatibility:

**Format 1: Angle Bracket (Standard)**
```otui
HealthBar < UIProgressBar
  size: 200 16
  background-color: #2a2a2a
```

**Format 2: Type First (Lua-style)**
```otui
UIProgressBar HealthBar
  size = 200 16
  background-color = #2a2a2a
```

**Format 3: Colon Separator**
```otui
HealthBar: UIProgressBar
  size: 200 16
```

### Property Formats

Both `:` and `=` separators are supported:

```otui
text: "Hello"        # Standard
text = "Hello"       # Lua-style
```

### Comments

```otui
-- Lua-style comment
// C-style comment

MyPanel < UIPanel  -- inline comment
```

### Advanced Features

**Anchors**
```otui
MyLabel < UILabel
  anchors.left: parent.left
  anchors.top: parent.top
  margin-left: 10
  margin-top: 5
```

**Layouts**
```otui
MyContainer < UIWidget
  layout:
    type: vertical
    spacing: 5
```

**State Styling (Pseudo-states)**
```otui
MyButton < UIButton
  background-color: #3a5a7f
  $hover:
    background-color: #4a6a8f
  $pressed:
    background-color: #2a4a6f
```

**Event Handlers**
```otui
MyButton < UIButton
  @onClick: |
    print("Button clicked!")
    doSomething()
```

**Internationalization**
```otui
MyLabel < UILabel
  !text: tr('greeting.hello')  # Marks text for translation
```

### Valid Widget Types

| Category | Types |
|----------|-------|
| **Containers** | `UIWidget`, `UIPanel`, `UIMiniWindow`, `UIScrollArea`, `UIScrollPanel`, `UISeparator`, `UITabBar`, `UITab` |
| **Display** | `UILabel`, `UIImage`, `UIProgressBar`, `UIList`, `UIListItem` |
| **Input** | `UIButton`, `UITextEdit`, `UICheckBox`, `UIRadioButton`, `UISlider`, `UIComboBox`, `UIDropDown` |
| **Layout** | `UIHorizontalLayout`, `UIVerticalLayout` |
| **Game** | `UIItem`, `UICreature`, `UIGameMap` |

### Complete Example

```otui
MainWindow < UIMiniWindow
  size: 300 400
  text: "Inventory"
  
  MiniWindowContents
    layout:
      type: vertical
      spacing: 8
    
    HeaderLabel < UILabel
      text: "Your Items"
      color: #ffcc00
      anchors.top: parent.top
      anchors.horizontalCenter: parent.horizontalCenter
    
    ItemContainer < UIScrollArea
      size: 280 300
      anchors.top: prev.bottom
      anchors.horizontalCenter: parent.horizontalCenter
      margin-top: 10
      
      ItemSlot < UIItem
        size: 32 32
        background-color: #1a1a1a
        border-color: #4a7a2a
    
    CloseButton < UIButton
      text: "Close"
      size: 100 24
      anchors.bottom: parent.bottom
      anchors.horizontalCenter: parent.horizontalCenter
      margin-bottom: 8
      @onClick: |
        self:getParent():destroy()
```

---

## 🔧 Project Structure

```
src/
├── components/
│   ├── editor/           # Main editor components
│   │   ├── OTUIEditor.tsx       # Main layout
│   │   ├── EditorCanvas.tsx     # Visual canvas with drag/drop
│   │   ├── WidgetPalette.tsx    # Widget library
│   │   ├── HierarchyTree.tsx    # Widget tree view
│   │   ├── PropertiesPanel.tsx  # Property editor
│   │   ├── EditorToolbar.tsx    # Import/export/validate
│   │   ├── AlignmentGuides.tsx  # Visual alignment system
│   │   └── ClientPreview.tsx    # OTClient renderer
│   └── ui/               # Reusable UI components (shadcn)
├── lib/
│   ├── editor-context.tsx    # State management
│   ├── otui-parser.ts        # OTUI string ↔ AST
│   ├── otui-types.ts         # Type definitions
│   ├── otui-validator.ts     # OTCR compliance checks
│   ├── otui-standard.ts      # Standard reference data
│   └── i18n.ts               # Internationalization
└── pages/
    └── Index.tsx             # Entry point
```

---

## 🤝 Contributing

Contributions are welcome! This editor is open for the OTClient community to test, improve, and extend.

### Areas for Improvement

- **Widget Templates**: Pre-built common UI patterns (login screens, inventory, etc.)
- **Theme System**: Color schemes and style presets
- **Grid Snapping**: Enhanced grid alignment options
- **Component Library**: Reusable composite widgets
- **Lua Integration**: Live Lua scripting/testing
- **More Widget Types**: Support for custom/extended widget types
- **Accessibility**: Keyboard navigation improvements

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes and test thoroughly
4. Commit with clear messages: `git commit -m "Add: feature description"`
5. Push and open a Pull Request

### Code Style

- TypeScript strict mode enabled
- ESLint configuration included
- Follow existing patterns for consistency
- Add comments for complex logic
- Update tests when adding features

---

## 🐛 Troubleshooting

### Import Errors

| Error | Solution |
|-------|----------|
| `No root-level widgets found` | Ensure at least one widget starts at indent level 0 |
| `No valid widgets found` | Check widget type names against valid types list |
| `Could not parse line...` | Verify indentation (spaces, not tabs) and property syntax |
| `Unknown Widget Type` | Use only widget types from the reference table above |

### Dragging Issues

- **Widget won't move**: Ensure widget is selected (click first)
- **Jumps to wrong position**: Check parent container constraints
- **Multi-select not working**: Hold Ctrl/Cmd or Shift while clicking

### Visual Glitches

- **Alignment guides stuck**: Release mouse button to clear guides
- **Viewport not visible**: Toggle viewport in canvas header
- **Properties not updating**: Check browser console for errors

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **State**: React Context + Custom Hooks
- **Parser**: Custom recursive descent parser

---

---

## 📜 License

This project is open source and available for the OTClient community. Feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- **OTClient Redemption** team for the OTUI standard
- **shadcn/ui** for beautiful UI components
- **Open Tibia** community for continued support

---

## 📞 Support & Community

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Share ideas and ask questions in GitHub Discussions
- **OTClient Forums**: Join the broader OTClient Redemption community

---

**Built with ❤️ for the OTClient community**
