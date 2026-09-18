# TinaCMS Industry Field Documentation

## Overview

Each equipment item in the catalogue can now be tagged with one or more industries it serves. This allows for industry-specific filtering and organization of equipment.

## Available Industries

The following industry options are available in the TinaCMS dropdown:

- **Food & Beverage** (`food-beverage`)
- **Pharmaceutical** (`pharmaceutical`)
- **Cosmetics** (`cosmetics`)
- **Logistics & Distribution** (`logistics`)
- **General / All Industries** (`general`)

## Usage in TinaCMS Admin

1. Navigate to the TinaCMS admin panel (typically at `/admin`)
1. Open any equipment item for editing
1. At the top of the form, you'll see the "Industries" field
1. Select one or more industries from the dropdown
1. The field is **required** - every equipment must have at least one industry

## Frontmatter Format

In the markdown files, the industries are stored as a YAML list:

```yaml
---
industries:
  - food-beverage
  - pharmaceutical
  - cosmetics
en-title: HC-M Checkweigher
# ... other fields
---
```

## Single Industry Example

```yaml
---
industries:
  - food-beverage
en-title: Hygienic Checkweigher
---
```

## Multiple Industries Example

```yaml
---
industries:
  - food-beverage
  - pharmaceutical
  - logistics
en-title: Universal Checkweigher System
---
```

## Querying by Industry

When you need to filter equipment by industry in your Astro components, you can access the `industries` field from the content collection:

```typescript
import { getCollection } from 'astro:content';

// Get all equipment for pharmaceutical industry
const pharmaEquipment = (await getCollection('equipment')).filter(
  (item) => item.data.industries?.includes('pharmaceutical')
);

// Get equipment serving multiple industries
const foodAndPharma = (await getCollection('equipment')).filter(
  (item) =>
    item.data.industries?.includes('food-beverage') &&
    item.data.industries?.includes('pharmaceutical')
);
```

## TypeScript Type

The `industries` field is typed as:

```typescript
industries: Array<'food-beverage' | 'pharmaceutical' | 'cosmetics' | 'logistics' | 'general'>
```

## Extending Industries

To add new industries:

1. Open `tina/config.ts`
1. Find the `industries` field configuration
1. Add new options to the `options` array:

```typescript
options: [
  { value: "food-beverage", label: "Food & Beverage" },
  { value: "pharmaceutical", label: "Pharmaceutical" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "logistics", label: "Logistics & Distribution" },
  { value: "general", label: "General / All Industries" },
  // Add your new industry here
  { value: "chemical", label: "Chemical Processing" },
],
```

4. Update all existing equipment markdown files to include the `industries` field
1. Update the TypeScript content collection schema if needed

## Best Practices

1. **Be specific**: Choose the most relevant industries for each equipment
1. **Use "general" sparingly**: Only use when equipment truly serves all industries equally
1. **Multiple industries**: It's common for industrial equipment to serve multiple industries
1. **Consistency**: Use the industry tags consistently across similar equipment types
