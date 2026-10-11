#!/usr/bin/env node

/**
 * Migration script: Convert content from prefixed fields to Decap native i18n (multiple_files)
 *
 * FROM: equipment/checkweighers/hc-a.md with en-title, ua-title fields
 * TO:   equipment/checkweighers/hc-a.en.md and hc-a.ua.md with clean field names
 *
 * Usage:
 *   node scripts/migrate-to-i18n.js --dry-run  # Preview changes
 *   node scripts/migrate-to-i18n.js            # Actually migrate
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');
const CONTENT_BASE = './src/content/equipment';
const LOCALES = ['en', 'ua'];

// Field mapping: oldName -> newName (for translatable fields)
const TRANSLATABLE_FIELDS = {
  title: true,
  description: true,
  body: true,
  label: true, // For category files
};

// Fields that should be duplicated (not prefixed)
const SHARED_FIELDS = ['order', 'industries', 'gallery', 'datasheet', 'icon'];

async function migrateFile(filePath) {
  console.log(`\n📄 Processing: ${filePath}`);

  const content = await fs.readFile(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);

  // Determine if this is a category file (index.md) or product file
  const isCategory = filePath.endsWith('index.md');
  const baseFilename = path.basename(filePath, '.md');
  const directory = path.dirname(filePath);

  // Check if this file has already been migrated (clean field names)
  if ('title' in frontmatter || 'label' in frontmatter) {
    console.log('  ⏭️  Already migrated (clean field names detected), skipping');
    return { skipped: true };
  }

  // Check if prefixed fields exist
  const hasPrefixedFields = LOCALES.some(lang =>
    `${lang}-title` in frontmatter || `${lang}-label` in frontmatter
  );

  if (!hasPrefixedFields) {
    console.log('  ⚠️  No prefixed fields found, skipping');
    return { skipped: true };
  }

  const results = [];

  for (const locale of LOCALES) {
    const newFrontmatter = {};
    const localePrefix = `${locale}-`;

    // Process all frontmatter fields
    for (const [key, value] of Object.entries(frontmatter)) {
      // Handle prefixed translatable fields
      if (key.startsWith(localePrefix)) {
        const cleanKey = key.slice(localePrefix.length);

        if (cleanKey === 'body') {
          // Body content goes into markdown body, not frontmatter
          results.push({ locale, bodyContent: value });
          continue;
        }

        newFrontmatter[cleanKey] = value;
      }
      // Handle specs array (special case - nested translatable fields)
      else if (key === 'specs' && Array.isArray(value)) {
        newFrontmatter.specs = value.map(spec => {
          // Extract locale-specific label
          const label = spec[`${locale}-label`] || spec.label || '';
          return {
            label,
            value: spec.value || ''
          };
        });
      }
      // Handle shared fields (copy as-is)
      else if (SHARED_FIELDS.includes(key)) {
        newFrontmatter[key] = value;
      }
    }

    // Construct new filename
    let newFilename;
    if (isCategory) {
      newFilename = `index.${locale}.md`;
    } else {
      newFilename = `${baseFilename}.${locale}.md`;
    }
    const newFilePath = path.join(directory, newFilename);

    // Find body content for this locale
    const bodyContent = results.find(r => r.locale === locale)?.bodyContent || '';

    // Generate new file content
    const newContent = matter.stringify(bodyContent, newFrontmatter);

    console.log(`  ✅ Creating: ${newFilename}`);
    console.log(`     Fields: ${Object.keys(newFrontmatter).join(', ')}`);

    if (!DRY_RUN) {
      await fs.writeFile(newFilePath, newContent, 'utf-8');
    }

    results.push({ locale, path: newFilePath, content: newContent });
  }

  // Delete original file
  if (!DRY_RUN) {
    console.log(`  🗑️  Deleting original: ${path.basename(filePath)}`);
    await fs.unlink(filePath);
  } else {
    console.log(`  [DRY-RUN] Would delete: ${path.basename(filePath)}`);
  }

  return { migrated: true, files: results };
}

async function main() {
  console.log('🚀 Decap CMS i18n Migration Script');
  console.log('=' .repeat(50));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  console.log(`Base directory: ${CONTENT_BASE}`);
  console.log('');

  // Find all markdown files in equipment folders
  const files = await glob(`${CONTENT_BASE}/**/*.md`, {
    ignore: ['**/node_modules/**', '**/*.en.md', '**/*.ua.md']
  });

  console.log(`Found ${files.length} markdown files to process\n`);

  const stats = {
    migrated: 0,
    skipped: 0,
    errors: 0
  };

  for (const file of files) {
    try {
      const result = await migrateFile(file);
      if (result.migrated) stats.migrated++;
      if (result.skipped) stats.skipped++;
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error.message);
      stats.errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`  ✅ Migrated: ${stats.migrated} files`);
  console.log(`  ⏭️  Skipped: ${stats.skipped} files`);
  console.log(`  ❌ Errors: ${stats.errors} files`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN - no files were changed');
    console.log('   Run without --dry-run to apply changes');
  } else {
    console.log('\n✨ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Replace config.yml with config.yml.new');
    console.log('   2. Update content.config.ts with new schema');
    console.log('   3. Update Astro pages to use new field names');
    console.log('   4. Test the CMS and build');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
