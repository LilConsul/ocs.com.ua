# TinaCMS Industry Dropdown - Visual Guide

## What You'll See in the Admin Panel

When you edit equipment in TinaCMS (`/admin`), the Industries dropdown will appear at the very top of the form, before all other fields.

## Field Appearance

```
┌─────────────────────────────────────────────────────────────┐
│ Equipment Catalogue Editor                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Industries *                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ☑ Food & Beverage                                      │ │
│  │ ☑ Pharmaceutical                                       │ │
│  │ ☑ Cosmetics                                           │ │
│  │ ☐ Logistics & Distribution                            │ │
│  │ ☐ General / All Industries                            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ℹ Select one or more industries this equipment serves      │
│                                                              │
│  [EN] Name of Equipment *                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ HC-M Checkweigher                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  [UA] Назва обладнання *                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Чеквейєр HC-M                                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ... rest of the form ...                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Selection Behavior

### Multi-Select Checkboxes

- Click on any industry name to toggle selection
- You can select **multiple industries** at once
- At least **one industry must be selected** (required field)
- Checked items will appear in the frontmatter as a YAML list

### Example Selections

#### Single Industry

```
☑ Food & Beverage
☐ Pharmaceutical
☐ Cosmetics
☐ Logistics & Distribution
☐ General / All Industries
```

Generates frontmatter:

```yaml
industries:
  - food-beverage
```

#### Multiple Industries

```
☑ Food & Beverage
☑ Pharmaceutical
☑ Cosmetics
☐ Logistics & Distribution
☐ General / All Industries
```

Generates frontmatter:

```yaml
industries:
  - food-beverage
  - pharmaceutical
  - cosmetics
```

#### All Industries

```
☐ Food & Beverage
☐ Pharmaceutical
☐ Cosmetics
☐ Logistics & Distribution
☑ General / All Industries
```

Generates frontmatter:

```yaml
industries:
  - general
```

## Field Validation

The field will show an error if you try to save without selecting at least one industry:

```
┌─────────────────────────────────────────────────┐
│  Industries *                                    │
│  ┌───────────────────────────────────────────┐  │
│  │ ☐ Food & Beverage                         │  │
│  │ ☐ Pharmaceutical                          │  │
│  │ ☐ Cosmetics                               │  │
│  │ ☐ Logistics & Distribution                │  │
│  │ ☐ General / All Industries                │  │
│  └───────────────────────────────────────────┘  │
│  ⚠ This field is required                       │
└─────────────────────────────────────────────────┘
```

## Tips

1. **For versatile equipment**: Select multiple industries (e.g., Food & Beverage + Pharmaceutical)
1. **For specialized equipment**: Select only the specific industry it serves
1. **Use "General" sparingly**: Only for truly universal equipment
1. **Consistency**: Tag similar equipment types with the same industries

## Testing the Integration

1. Run `bun run dev`
1. Navigate to `http://localhost:4321/admin`
1. Click on "Equipment Catalogue" in the sidebar
1. Open an existing equipment or create a new one
1. You should see the Industries dropdown at the top
1. Select industries and save
1. Check the markdown file to verify the frontmatter was updated
