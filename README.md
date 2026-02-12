# OTUI Designer Suite

Visual editor for creating OTUI interfaces compatible with OTClient Redemption.

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## OTUI Format Guide

### Supported Widget Declaration Formats

The parser accepts multiple widget declaration formats for compatibility with different OTUI sources (including OTClient Redemption modules):

**Format 1: Angle Bracket (Standard)**
```otui
WidgetName < WidgetType
  property: value
```

**Format 2: Inverted (Type Name)**
```otui
WidgetType WidgetName
  property: value
```

**Format 3: Colon Separator**
```otui
WidgetName: WidgetType
  property: value
```

### Property Declaration Formats

Properties support both colon and equals separators:

```otui
-- Colon style (standard)
size: 200 150
background-color: #2a2a2a

-- Lua-style equals (OTCR compatible)
size = 200 150
background-color = #2a2a2a
```

### Comments
Both C-style (`//`) and Lua-style (`--`) comments are supported:

```otui
// Commented widget
-- Another comment

MyPanel < UIPanel  -- inline comment
  size: 200 150
```

### Complete Example
```otui
MyPanel < UIPanel
  size: 200 150
  background-color: #2a2a2a
  padding: 8

  ChildWidget < UILabel
    text: "Hello"
    color: #fff
    anchors.centerIn: parent
```

### Valid Widget Types
**Containers**: UIWidget, UIPanel, UIMiniWindow, UIScrollArea, UISeparator, UITabBar, UITab

**Display**: UILabel, UIImage, UIProgressBar, UIList, UIListItem

**Input**: UIButton, UITextEdit, UICheckBox, UIRadioButton, UISlider, UIComboBox, UIDropDown

**Layout**: UIHorizontalLayout, UIVerticalLayout

**Game**: UIItem, UICreature

### Importing OTUI Files
1. Click the **Import** button (↑) in the toolbar
2. Choose **Load File** to import a `.otui` file, or **Paste Code** for text
3. The parser will validate the format and show helpful error messages

### Compatible With OTClient Redemption
The parser supports various OTUI formats used in OTClient Redemption modules, including:
- Standard format: `WidgetName < WidgetType`
- Lua-style format: `UIWidget WidgetName` or `type = value`
- Colon format: `WidgetName: UIWidget`
- Comments in both C (`//`) and Lua (`--`) styles

### Troubleshooting Import Errors

| Error | Solution |
|-------|----------|
| `No root-level widgets found` | Ensure you have at least one widget at indent 0 |
| `No valid widgets found` | Check widget type names are correct (list above) |
| `Could not parse...` | Verify indentation and property syntax |
| `Unknown Widget Type` | Use only types from the valid list above |

### Example Test Files
Test files with different formats are included:
- `otcr-format1.otui` - Lua-style comments with colon properties
- `otcr-format2.otui` - Lua-style equals separator
- `otcr-format3.otui` - Inverted format (Type WidgetName)
- `otcr-format4.otui` - Colon separator format

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
