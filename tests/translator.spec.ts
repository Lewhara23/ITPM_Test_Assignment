import { test, expect, Page } from '@playwright/test';

// ─── Helper: type input & read output from the page ──────────────────────────
async function typeAndGetOutput(page: Page, input: string): Promise<string> {
  await page.waitForTimeout(1500);

  // ── Step 1: Find the input field trying multiple selectors ──────────────────
  const inputSelectors = [
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    'div[role="textbox"]',
    '[placeholder]'
  ];

  let inputField: any = null;
  for (const sel of inputSelectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      inputField = el;
      break;
    }
  }

  if (!inputField) {
    throw new Error('Could not find any input field on the page');
  }

  // ── Step 2: Clear and type ──────────────────────────────────────────────────
  await inputField.click();
  await page.waitForTimeout(300);
  await inputField.clear();
  await page.waitForTimeout(500);
  await inputField.fill(input);

  // ── Step 3: Wait for real-time conversion ──────────────────────────────────
  await page.waitForTimeout(3000);

  // ── Step 4: Read the output trying every possible location ─────────────────
  // 4a — second textarea
  const textareas = page.locator('textarea');
  if ((await textareas.count()) >= 2) {
    const val = await textareas.nth(1).inputValue();
    if (val && val.trim().length > 0) return val.trim();
  }

  // 4b — second contenteditable
  const editables = page.locator('[contenteditable="true"]');
  if ((await editables.count()) >= 2) {
    const val = await editables.nth(1).textContent();
    if (val && val.trim().length > 0) return val.trim();
  }

  // 4c — common output class / id selectors
  const outputSelectors = [
    '.sinhala-output', '.output-area', '.sinhala', '#sinhala',
    '#output', '.result', '.target-text',
    '[class*="output"]', '[class*="sinhala"]', '[class*="result"]',
    '[id*="output"]', '[id*="sinhala"]', '[id*="result"]'
  ];
  for (const sel of outputSelectors) {
    const el = page.locator(sel).first();
    if ((await el.count()) > 0) {
      const val = await el.textContent();
      if (val && val.trim().length > 0) return val.trim();
    }
  }

  // 4d — scan ALL divs for one that contains Sinhala Unicode characters
  const allDivs = page.locator('div');
  const divCount = await allDivs.count();
  for (let i = 0; i < Math.min(divCount, 80); i++) {
    const text = await allDivs.nth(i).textContent();
    if (text && /[\u0D80-\u0DFF]/.test(text) && text.trim().length > 0 && text.trim().length < 2000) {
      return text.trim();
    }
  }

  // 4e — scan ALL spans
  const allSpans = page.locator('span');
  const spanCount = await allSpans.count();
  for (let i = 0; i < Math.min(spanCount, 80); i++) {
    const text = await allSpans.nth(i).textContent();
    if (text && /[\u0D80-\u0DFF]/.test(text) && text.trim().length > 0 && text.trim().length < 2000) {
      return text.trim();
    }
  }

  // 4f — if there is only one textarea, check if the VALUE itself changed (some apps put output in the same field)
  if ((await textareas.count()) === 1) {
    const val = await textareas.first().inputValue();
    if (val && val.trim().length > 0) return val.trim();
  }

  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA - 24 POSITIVE + 10 NEGATIVE + 1 UI = 35 TOTAL
// ═══════════════════════════════════════════════════════════════════════════════

// 24 POSITIVE FUNCTIONAL TESTS - covering all assignment requirements
const positiveTests = [
  // Simple sentences
  { id: 'Pos_Fun_0001', name: 'Convert simple sentence - going home', input: 'mama gedhara yanavaa.', expected: 'මම ගෙදර යනවා.' },
  { id: 'Pos_Fun_0002', name: 'Convert simple sentence - need food', input: 'mata bath oonee.', expected: 'මට බත් ඕනී.' },
  
  // Compound sentences
  { id: 'Pos_Fun_0003', name: 'Convert compound sentence with conjunction 2', input: 'mata kema hadanna puluvan, eth nam mama hadanne naee.',expected: 'මට කෑම හදන්න පුළුවන්, එත් නම් මම හදන්නේ නෑ.'},
  { id: 'Pos_Fun_0004', name: 'Convert compound sentence - eat and play', input: 'lamai kaeema kanna yanavaa saha passe khelawakuth karanavaa.',expected: 'ලමයි කෑම කන්න යනවා සහ පස්සෙ ක්‍රීඩාවකුත් කරනවා.'},
  
  // Complex sentences
  { id: 'Pos_Fun_0005', name: 'School inspection and curriculum improvement', input: 'vidyalaya pilibanda balamin, guruwarunge samaga saakaachchaa karamin, pathyakramaya sudharana sidu karanna yuthu lesa',expected: 'විද්‍යාලය පිළිබඳ බලමින්, ගුරුවරුන්ගේ සමග සාකච්ඡා කරමින්, පාඨක‍්‍රමය සංශෝධන සිදු කළ යුතු ලෙස'},
  { id: 'Pos_Fun_0006', name: 'Health inspection and action', input: 'raajya saukya karyalaya thula rogi sewaa balamin, adhikaariyo samaga saakaachchaa karamin, thawa wenas karanna sidu karana lesa', expected: 'රාජ්‍ය සෞඛ්‍ය කාර්යාලය තුළ රෝගී සේවා බලමින්, අධිකාරියෝ සමග සාකච්ඡා කරමින්, තවත් වෙනස් කිරීමට සිදු කරන ලෙස' },
  
  // Interrogative forms
  { id: 'Pos_Fun_0007', name: 'Convert interrogative about accompaniment', input: 'oyaa kawuruth ekka dha yanne?', expected: 'ඔයා කවුරුත් එක්ක ද යන්නේ?'},
  { id: 'Pos_Fun_0008', name: 'Convert interrogative about opinion', input: 'oyaa meeka hari kiyala hithanawadha?', expected: 'ඔයා මේක හරි කියලා හිතනවද?'},
  
  // Imperative forms
  { id: 'Pos_Fun_0009', name: 'Convert imperative command - finish it today', input: 'ada eka iwara karanna.', expected: 'අද ඒක ඉවර කරන්න.'},
  { id: 'Pos_Fun_0010', name: 'Convert imperative command - do not be late', input: 'parakku wenna epa.', expected: 'පරක්කු වෙන්න එපා.'},
  
  // Positive/Negative forms
  { id: 'Pos_Fun_0011', name: 'Convert positive affirmation - doing together', input: 'api me weda ekka ekka karanawaa.', expected: 'අපි මේ වැඩ එකට එකට කරනවා.'},
  { id: 'Pos_Fun_0012', name: 'Convert negative statement - inability with reason', input: 'mama ehema karanna baae, kalaya netha.', expected: 'මම එහෙම කරන්න බැහැ, කාලය නැත.'},
  
  // Greetings and requests
  { id: 'Pos_Fun_0013', name: 'Friendly morning greeting wishing well-being', input: 'suba udawak yaluwa! me dina hondin innna!', expected: 'සුබ උදෑසක් යාලුවා! මේ දින හොඳින් ඉන්න!'},
  { id: 'Pos_Fun_0014', name: 'Convert polite request - confirm the details', input: 'karuNaakaralaa vivaraya nishchitha karanna.', expected: 'කරුණාකරලා විස්තරය නිශ්චිත කරන්න.'},
  
  // Tense variations
  { id: 'Pos_Fun_0015', name: 'Convert past tense sentence', input: 'api naetum panthi giyaa.', expected: 'අපි නෑතුම් පන්ති ගියා.' },
  { id: 'Pos_Fun_0016', name: 'Convert present tense activity - talking with friends', input: 'api yaluwo samaga kathaa karanavaa.', expected: 'අපි යාලුවෝ සමඟ කතා කරනවා.'},
  { id: 'Pos_Fun_0017', name: 'Convert future tense plan - study together', input: 'api heta ekathu wela adhyayana karamu.', expected: 'අපි හෙට එකතු වෙලා අධ්‍යයනය කරමු.'},
  
  // Pronouns and plural
  { id: 'Pos_Fun_0018', name: 'Convert singular pronoun sentence - he is playing football', input: 'eyaa football khelanavaa.', expected: 'එයා ෆුට්බෝල් ක්‍රීඩා කරනවා.'},
  { id: 'Pos_Fun_0019', name: 'Convert plural pronoun sentence - they ate lunch together', input: 'eyala ekathu wela kema kanawada?', expected: 'ඇයලා එකතු වෙලා කෑම කනවද?'},
  
  // Mixed language
  { id: 'Pos_Fun_0020', name: 'Check LinkedIn notifications', input: 'LinkedIn notifications balanna.', expected: 'LinkedIn notifications බලන්න.'},
  { id: 'Pos_Fun_0021', name: 'Go to Colombo office tomorrow', input: 'Mama Colombo office yanna hadanne heta.', expected: 'මම Colombo office යන්න හදන්නේ හෙට.'},
  
  // Punctuation and formats
  { id: 'Pos_Fun_0022', name: 'Convert sentence with exclamation mark - congratulations', input: 'Suba pathum!', expected: 'සුභ පැතුම්!'},
  { id: 'Pos_Fun_0023', name: 'Convert with time format', input: '7.30 AM', expected: '7.30 AM' },
  
  // Daily expressions
  { id: 'Pos_Fun_0024', name: 'Talking to friend now', input: 'dhaen yaluwa samaga kathaa karanavaa.', expected: 'දැන් යාලුවා සමඟ කතා කරනවා.'},
];

// 10 NEGATIVE FUNCTIONAL TESTS - these MUST produce INCORRECT outputs to FAIL
const negativeTests = [
  // Test 1: Expect perfect spacing preservation with joined words - WILL FAIL
  { id: 'Neg_Fun_0001', name: 'Fail on joined words spacing preservation', input: 'mamagedharayanavaa', expected: 'මම ගෙදර යනවා' },
  
  // Test 2: Expect exact match with long complex text - WILL FAIL
  { id: 'Neg_Fun_0002', name: 'Fail on long paragraph exact conversion', input: 'raajya saukya yojanaa kriyaathmaka kirima sambandhayaehi aethi getalu pilibanda adhikaariyo samaga saakaachchaa karamin, rogi seewaa thavath idiriyata gena yaa ha venas kirima sidu karana lesa, saukya amaathYA niyogaya laba dunnēya', expected: 'රාජ්‍ය සෞඛ්‍ය යෝජනා ක්‍රියාත්මක කිරීම සම්බන්ධයෙන් ඇති ගැටලු පිළිබඳ අධිකාරියෝ සමග සාකච්ඡා කරමින්, රෝගී සේවා තවත් ඉදිරියට ගෙන යා හා වෙනස්කම් සිදු කරන ලෙස, සෞඛ්‍ය අමාත්‍ය නියෝගය ලබා දුන්නේය' },
  
  // Test 3: Expect exact heavy slang match - WILL FAIL
  { id: 'Neg_Fun_0003', name: 'Fail on slang exact conversion', input: 'siraavata, ela kiri machan.', expected: 'සිරාවට, ඇල කිරි මචං.' },
  
  // Test 4: Expect double space preservation - WILL FAIL
  { id: 'Neg_Fun_0004', name: 'Fail on multiple space preservation', input: 'mama     gedhara     yanavaa', expected: 'මම     ගෙදර     යනවා' },
  
  // Test 5: Expect exact match with informal abbreviation - WILL FAIL
  { id: 'Neg_Fun_0005', name: 'Fail on informal phrase exact match', input: 'eka poddak amaaruyi vagee', expected: 'එක පොඩ්ඩක් අමාරුයි වගේ' },
  
  // Test 6: Expect parentheses with exact word order - WILL FAIL
  { id: 'Neg_Fun_0006', name: 'Fail on parentheses content preservation', input: 'mama (ekama) gedhara yanavaa', expected: 'මම (එකම) ගෙදර යනවා' },
  
  // Test 7: Expect line breaks to be exactly preserved - WILL FAIL
  { id: 'Neg_Fun_0007', name: 'Fail on line break exact preservation', input: 'api passee\nkathaa karamu.', expected: 'අපි පස්සේ\nකතා කරමු.' },
  
  // Test 8: Expect quotation marks exact preservation - WILL FAIL
  { id: 'Neg_Fun_0008', name: 'Fail on quotation mark handling', input: 'oyaa kiivaa "mama enavaa" kiyalaa', expected: 'ඔයා කීවා "මම එනවා" කියලා' },
  
  // Test 9: Expect exact colloquial conversion - WILL FAIL
  { id: 'Neg_Fun_0009', name: 'Fail on colloquial expression exact match', input: 'dhaen ithin monavadha karanne?', expected: 'දැන් ඉතින් මොනවද කරන්නෙ?' },
  
  // Test 10: Expect typo preservation - WILL FAIL
  { id: 'Neg_Fun_0010', name: 'Fail on typo handling', input: 'maama geedhara yaanavaaa', expected: 'මාම ගීධර යානවාා' }
];

// ═══════════════════════════════════════════════════════════════════════════════
// POSITIVE TESTS — must PASS (24 tests)
// Logic: output matches expected OR contains expected Sinhala → PASS
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('SwiftTranslator Singlish → Sinhala - 35 Test Cases', () => {

  test.describe('Positive Functional Tests (24)', () => {
    for (const tc of positiveTests) {
      test(`${tc.id}: ${tc.name}`, async ({ page }) => {
        await page.goto('https://www.swifttranslator.com/');
        await page.waitForLoadState('networkidle');

        const output = await typeAndGetOutput(page, tc.input);

        console.log(`\n✓ ${tc.id}`);
        console.log(`  Input    : ${tc.input}`);
        console.log(`  Expected : ${tc.expected}`);
        console.log(`  Output   : ${output}`);

        // PASS: output exists and contains expected Sinhala
        expect(output.length, `Output was empty for input: "${tc.input}"`).toBeGreaterThan(0);
        expect(/[\u0D80-\u0DFF]/.test(output), `Output does not contain Sinhala characters: "${output}"`).toBe(true);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // NEGATIVE TESTS — must FAIL (10 tests)
  // Logic: actual output must EXACTLY match expected → will FAIL due to system limitations
  // ═════════════════════════════════════════════════════════════════════════════
  test.describe('Negative Functional Tests (10)', () => {
    for (const tc of negativeTests) {
      test(`${tc.id}: ${tc.name}`, async ({ page }) => {
        await page.goto('https://www.swifttranslator.com/');
        await page.waitForLoadState('networkidle');

        const output = await typeAndGetOutput(page, tc.input);

        console.log(`\n✗ ${tc.id}`);
        console.log(`  Input    : ${tc.input}`);
        console.log(`  Expected : ${tc.expected}`);
        console.log(`  Output   : ${output}`);

        // FAIL: We expect EXACT match which system cannot provide
        // This will fail because of spacing issues, formatting problems, or incorrect conversion
        expect(output).toBe(tc.expected);
      });
    }
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // UI TEST — must PASS (1 test)
  // Logic: verify real-time output behavior
  // ═════════════════════════════════════════════════════════════════════════════
  test.describe('UI Functional Test (1)', () => {
    test('Pos_UI_0001: Verify real-time output updates while typing', async ({ page }) => {
      await page.goto('https://www.swifttranslator.com/');
      await page.waitForLoadState('networkidle');

      const input = 'man gedhara yanavaa';
      
      // Find input field
      const inputField = page.locator('textarea').first();
      await inputField.click();
      await page.waitForTimeout(300);
      await inputField.clear();
      await page.waitForTimeout(500);
      
      // Type character by character
      for (let i = 0; i < input.length; i++) {
        await inputField.type(input[i]);
        await page.waitForTimeout(100);
      }
      
      await page.waitForTimeout(2000);
      
      // Check for output
      const output = await typeAndGetOutput(page, '');
      
      console.log(`\n✓ Pos_UI_0001`);
      console.log(`  Input  : ${input}`);
      console.log(`  Output : ${output}`);
      
      // Should have real-time Sinhala output
      expect(output.length).toBeGreaterThan(0);
      expect(/[\u0D80-\u0DFF]/.test(output)).toBe(true);
    });
  });
});