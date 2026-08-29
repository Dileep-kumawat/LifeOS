import { DEFAULT_EXPENSE_CATEGORIES } from "../schemas/finance.js";
// Common non-merchant header lines to discard
const HEADER_IGNORE_PATTERNS = [
    /^(?:RECEIPT|TAX\s*INVOICE|INVOICE|SALES\s*RECEIPT|CUSTOMER\s*COPY|MERCHANT\s*COPY|OFFICIAL\s*RECEIPT)$/i,
    /^(?:WELCOME(?:\s+TO)?|THANK\s*YOU(?:\s+FOR\s+SHOPPING(?:\s+WITH\s+US)?)?|HAVE\s+A\s+NICE\s+DAY)$/i,
    /^(?:ORDER\s*#?|CHECK\s*#?|TABLE\s*#?|TRANSACTION\s*#?|TRANS\s*#?|REF\s*#?|REGISTER\s*#?|CASHIER\s*#?)\s*[:\w\d-]+$/i,
    /^(?:TEL|PHONE|FAX|CALL)\s*[:#.]?\s*[\d\s()+-]+$/i,
    /^(?:HTTPS?:\/\/|WWW\.)[\w\d.-]+\.[a-z]{2,}/i,
    /^[\w\d.-]+@[\w\d.-]+\.[a-z]{2,}$/i,
    /^\d+\s+[\w\s.,-]+(?:ST|STREET|AVE|AVENUE|RD|ROAD|BLVD|BOULEVARD|DR|DRIVE|WAY|LANE|LN|SUITE|STE|UNIT|HWY|HIGHWAY)\b/i,
    /^(?:PO\s*BOX|P\.O\.\s*BOX)\s*\d+/i,
    /^(?:STORE|BRANCH|SHOP|LOCATION)\s*#?\s*\d+$/i
];
// Category keyword matching dictionary for expense category suggestions
const CATEGORY_KEYWORDS = {
    Food: /\b(?:coffee|cafe|starbucks|dunkin|costa|mcdonald|burger|pizza|restaurant|bakery|grocery|supermarket|market|trader\s*joe|whole\s*foods|kroger|safeway|dining|chipotle|subway|taco|kitchen|bar|grill|sushi|bistro|food|eats|diner|pub|bakery|canteen|bagel|donut|panera)\b/i,
    Transport: /\b(?:uber|lyft|taxi|cab|shell|chevron|bp|exxon|mobil|texaco|gas(?:oline)?|fuel|petrol|transit|metro|subway|train|amtrak|rail|parking|toll|airline|delta|united|american\s*air|southwest|ryanair|easyjet|flight)\b/i,
    Utilities: /\b(?:electric|water|gas\s*utility|power|energy|internet|broadband|comcast|xfinity|verizon|at&t|t-mobile|spectrum|wifi|telecom|waste|sewer|trash)\b/i,
    Shopping: /\b(?:target|walmart|amazon|best\s*buy|costco|home\s*depot|lowes|ikea|zara|h&m|uniqlo|gap|nike|adidas|clothing|apparel|hardware|electronics|department\s*store|retail|apple\s*store)\b/i,
    Health: /\b(?:pharmacy|chemist|cvs|walgreens|boots|hospital|clinic|doctor|physician|dental|dentist|optical|optician|prescription|rx|medicine|healthcare|medical|meds|eyecare)\b/i,
    Entertainment: /\b(?:cinema|theatre|theater|amc|regal|movie|film|netflix|spotify|hulu|disney|bowling|arcade|games|ticketmaster|concert|event|museum|amusement)\b/i,
    Housing: /\b(?:rent|mortgage|apartment|landlord|realty|property|hoa|realtor|lease)\b/i
};
/**
 * Normalizes and formats an extracted date into standard ISO YYYY-MM-DD.
 */
function normalizeDateString(rawDateStr) {
    try {
        const clean = rawDateStr.trim().replace(/[.]/g, "-").replace(/[/]/g, "-");
        // Format 1: YYYY-MM-DD
        const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
            const y = parseInt(isoMatch[1], 10);
            const m = parseInt(isoMatch[2], 10);
            const d = parseInt(isoMatch[3], 10);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2040) {
                return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            }
        }
        // Format 2: MM-DD-YYYY or DD-MM-YYYY
        const dmyMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (dmyMatch) {
            const p1 = parseInt(dmyMatch[1], 10);
            const p2 = parseInt(dmyMatch[2], 10);
            const y = parseInt(dmyMatch[3], 10);
            // If p1 > 12, it must be DD-MM-YYYY
            if (p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
                return `${y}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
            }
            // Otherwise default to standard MM-DD-YYYY
            if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
                return `${y}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
            }
        }
        // Format 3: MM-DD-YY or DD-MM-YY (2-digit year)
        const shortYrMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
        if (shortYrMatch) {
            const p1 = parseInt(shortYrMatch[1], 10);
            const p2 = parseInt(shortYrMatch[2], 10);
            const shortY = parseInt(shortYrMatch[3], 10);
            const y = 2000 + shortY;
            if (p1 > 12 && p1 <= 31 && p2 >= 1 && p2 <= 12) {
                return `${y}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
            }
            if (p1 >= 1 && p1 <= 12 && p2 >= 1 && p2 <= 31) {
                return `${y}-${String(p1).padStart(2, "0")}-${String(p2).padStart(2, "0")}`;
            }
        }
        // Attempt standard JS Date parse for textual representations (e.g. "Aug 27, 2026", "27 August 2026")
        const parsed = new Date(rawDateStr);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = parsed.getMonth() + 1;
            const d = parsed.getDate();
            if (y >= 2000 && y <= 2040) {
                return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            }
        }
    }
    catch {
        // Parsing failure
    }
    return null;
}
/**
 * Extracts a candidate merchant name from the top lines of raw receipt text.
 */
function extractMerchant(lines, lowConfidenceThreshold) {
    const topLines = lines.slice(0, 8);
    for (let i = 0; i < topLines.length; i++) {
        const rawLine = topLines[i].trim();
        if (!rawLine || rawLine.length < 2)
            continue;
        // Check if line matches ignore patterns
        const isIgnored = HEADER_IGNORE_PATTERNS.some((pattern) => pattern.test(rawLine));
        if (isIgnored)
            continue;
        // Check if line is primarily numbers/symbols or a price
        const hasLetters = /[a-zA-Z\u00C0-\u024F]/.test(rawLine);
        if (!hasLetters)
            continue;
        const pricePattern = /^(?:[\$\₹\€\£\¥]\s*)?\d+(?:[.,]\d{2})?$/;
        if (pricePattern.test(rawLine))
            continue;
        // Clean up excessive store noise or leading bullets
        let cleanMerchant = rawLine.replace(/^[#*•-]+\s*/, "").trim();
        // Determine confidence score based on position and character clarity
        let confidence = 0.92;
        if (i > 2)
            confidence = 0.78;
        if (i > 5)
            confidence = 0.65;
        // Minor penalty if merchant name has suspicious noise symbols
        if (/[<>{}[\]\\|~^]/.test(cleanMerchant)) {
            confidence -= 0.15;
        }
        confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
        return {
            value: cleanMerchant,
            confidence,
            isLowConfidence: confidence < lowConfidenceThreshold,
            rawText: rawLine
        };
    }
    // Fallback if no clean line found
    const firstNonEmpty = lines.find((l) => l.trim().length > 0)?.trim() || "";
    if (firstNonEmpty) {
        return {
            value: firstNonEmpty,
            confidence: 0.45,
            isLowConfidence: true,
            rawText: firstNonEmpty
        };
    }
    return {
        value: "",
        confidence: 0,
        isLowConfidence: true
    };
}
/**
 * Extracts the final total transaction amount from receipt text.
 */
function extractTotalAmount(lines, lowConfidenceThreshold) {
    // Common keywords explicitly designating the final amount
    const totalKeywordsRegex = /\b(?:TOTAL|GRAND\s*TOTAL|TOTAL\s*DUE|AMOUNT\s*DUE|BAL(?:ANCE)?\s*DUE|NET\s*AMOUNT|TOTAL\s*PAID|FINAL\s*TOTAL|TOTAL\s*AMOUNT|TOTAL\s*USD|AMOUNT\s*TENDERED|AMOUNT|PAID)\b/i;
    const negativeKeywordsRegex = /\b(?:SUBTOTAL|SUB\s*TOTAL|TAX|SALES\s*TAX|CHANGE|CASH\s*CHANGE|CASH\s*BACK|SAVINGS|DISCOUNT|ITEMS\s*IN\s*TRANS|ITEMS\s*SOLD)\b/i;
    // Strict decimal price or currency prefixed pattern: "$12.50", "12.50", "₹1,250.00", "$15"
    const totalLineAmountPattern = /(?:[\$\₹\€\£\¥]\s*)?(\d{1,6}(?:,\d{3})*\.\d{2}|\d{1,6}\.\d{2}|\b\d{1,6}(?:,\d{3})+\b|\b\d{1,6}\b)/g;
    const currencyOrDecimalPattern = /(?:[\$\₹\€\£\¥]\s*(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)|(\d{1,6}(?:,\d{3})*\.\d{2}))/g;
    // Strategy 1: Scan bottom-to-top for lines containing explicit TOTAL keywords (without negative keywords)
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line)
            continue;
        if (totalKeywordsRegex.test(line) && !negativeKeywordsRegex.test(line)) {
            const matches = Array.from(line.matchAll(totalLineAmountPattern));
            if (matches.length > 0) {
                // Take the last numerical amount on the total line
                const rawNumStr = matches[matches.length - 1][1].replace(/,/g, "");
                const parsedNum = parseFloat(rawNumStr);
                if (!isNaN(parsedNum) && parsedNum > 0) {
                    const confidence = 0.95;
                    return {
                        value: parsedNum,
                        confidence,
                        isLowConfidence: confidence < lowConfidenceThreshold,
                        rawText: line
                    };
                }
            }
        }
    }
    // Strategy 2: If a line has "TOTAL" keyword and the amount is on the immediately following line
    for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (totalKeywordsRegex.test(line) && !negativeKeywordsRegex.test(line)) {
            const nextLine = lines[i + 1].trim();
            const matches = Array.from(nextLine.matchAll(totalLineAmountPattern));
            if (matches.length > 0) {
                const rawNumStr = matches[0][1].replace(/,/g, "");
                const parsedNum = parseFloat(rawNumStr);
                if (!isNaN(parsedNum) && parsedNum > 0) {
                    const confidence = 0.88;
                    return {
                        value: parsedNum,
                        confidence,
                        isLowConfidence: confidence < lowConfidenceThreshold,
                        rawText: `${line} ${nextLine}`
                    };
                }
            }
        }
    }
    // Strategy 3: Find lines with currency symbols or explicit decimal amounts near the bottom
    const candidateAmounts = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (negativeKeywordsRegex.test(line))
            continue;
        const matches = Array.from(line.matchAll(currencyOrDecimalPattern));
        for (const match of matches) {
            const matchedStr = (match[1] || match[2] || "").replace(/,/g, "");
            const num = parseFloat(matchedStr);
            // Valid monetary filter (between $0.01 and $50,000)
            if (!isNaN(num) && num > 0.009 && num <= 50000) {
                candidateAmounts.push({ amount: num, line, lineIndex: i });
            }
        }
    }
    if (candidateAmounts.length > 0) {
        // If we have candidates, sort by highest amount or closest to bottom
        // Usually the total is the maximum non-tax monetary figure near bottom
        const maxCandidate = candidateAmounts.reduce((prev, curr) => curr.amount > prev.amount ? curr : prev);
        const confidence = 0.55;
        return {
            value: maxCandidate.amount,
            confidence,
            isLowConfidence: true,
            rawText: maxCandidate.line
        };
    }
    return {
        value: null,
        confidence: 0,
        isLowConfidence: true
    };
}
/**
 * Extracts the transaction date from receipt text.
 */
function extractReceiptDate(lines, lowConfidenceThreshold, _referenceDate) {
    // Regex 1: ISO format (2026-08-27 or 2026/08/27 or 2026.08.27)
    const isoRegex = /\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/;
    // Regex 2: Standard US/EU (MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, DD-MM-YYYY)
    const dmyRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/;
    // Regex 3: Two digit year (MM/DD/YY, DD/MM/YY)
    const shortYrRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2})\b/;
    // Regex 4: Month name text ("27 Aug 2026", "August 27, 2026", "27-Aug-2026")
    const wordMonthRegex = /\b((?:\d{1,2}\s+)?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:[\s,.-]+\d{1,2}(?:st|nd|rd|th)?)?[\s,.-]+20\d{2})\b/i;
    for (const line of lines) {
        const rawLine = line.trim();
        if (!rawLine)
            continue;
        // Check ISO
        const isoMatch = rawLine.match(isoRegex);
        if (isoMatch) {
            const normalized = normalizeDateString(isoMatch[1]);
            if (normalized) {
                return {
                    value: normalized,
                    confidence: 0.95,
                    isLowConfidence: 0.95 < lowConfidenceThreshold,
                    rawText: rawLine
                };
            }
        }
        // Check Word Month
        const wordMatch = rawLine.match(wordMonthRegex);
        if (wordMatch) {
            const normalized = normalizeDateString(wordMatch[1]);
            if (normalized) {
                return {
                    value: normalized,
                    confidence: 0.92,
                    isLowConfidence: 0.92 < lowConfidenceThreshold,
                    rawText: rawLine
                };
            }
        }
        // Check standard 4-digit year format
        const dmyMatch = rawLine.match(dmyRegex);
        if (dmyMatch) {
            const normalized = normalizeDateString(dmyMatch[1]);
            if (normalized) {
                return {
                    value: normalized,
                    confidence: 0.88,
                    isLowConfidence: 0.88 < lowConfidenceThreshold,
                    rawText: rawLine
                };
            }
        }
        // Check 2-digit year format
        const shortMatch = rawLine.match(shortYrRegex);
        if (shortMatch) {
            const normalized = normalizeDateString(shortMatch[1]);
            if (normalized) {
                return {
                    value: normalized,
                    confidence: 0.72,
                    isLowConfidence: 0.72 < lowConfidenceThreshold,
                    rawText: rawLine
                };
            }
        }
    }
    // Fallback: no date found
    return {
        value: null,
        confidence: 0,
        isLowConfidence: true
    };
}
/**
 * Suggests a finance category using fast keyword heuristics against merchant/receipt text.
 */
function suggestCategory(merchantText, fullText, categories, lowConfidenceThreshold) {
    const cleanMerchant = (merchantText || "").toLowerCase();
    // Phase 1: High-confidence match against merchant name directly
    if (cleanMerchant) {
        for (const [categoryName, regex] of Object.entries(CATEGORY_KEYWORDS)) {
            if (regex.test(cleanMerchant)) {
                const matchedUserCategory = categories.find((c) => c.toLowerCase() === categoryName.toLowerCase());
                const resolvedCategory = matchedUserCategory || categoryName;
                return {
                    value: resolvedCategory,
                    confidence: 0.88,
                    isLowConfidence: 0.88 < lowConfidenceThreshold,
                    rawText: merchantText
                };
            }
        }
    }
    // Phase 2: Medium-confidence match against body text / line items
    const cleanFull = (fullText || "").toLowerCase();
    for (const [categoryName, regex] of Object.entries(CATEGORY_KEYWORDS)) {
        if (regex.test(cleanFull)) {
            const matchedUserCategory = categories.find((c) => c.toLowerCase() === categoryName.toLowerCase());
            const resolvedCategory = matchedUserCategory || categoryName;
            return {
                value: resolvedCategory,
                confidence: 0.72,
                isLowConfidence: 0.72 < lowConfidenceThreshold,
                rawText: merchantText
            };
        }
    }
    return {
        value: null,
        confidence: 0,
        isLowConfidence: true
    };
}
/**
 * Extracts basic line items if present (e.g. "Item name  12.50").
 */
function extractLineItems(lines) {
    const items = [];
    const lineItemRegex = /^([a-zA-Z0-9\s.,&'#-]{2,40})\s+[\$\₹\€\£\¥]?\s*(\d+\.\d{2})$/;
    for (const line of lines) {
        const clean = line.trim();
        if (/total|subtotal|tax|balance|change|cash|visa|mastercard|amex|debit|credit/i.test(clean)) {
            continue;
        }
        const match = clean.match(lineItemRegex);
        if (match) {
            const description = match[1].trim();
            const amount = parseFloat(match[2]);
            if (description && !isNaN(amount)) {
                items.push({
                    description,
                    amount,
                    confidence: 0.85
                });
            }
        }
    }
    return items;
}
/**
 * Structured Receipt OCR Parser
 *
 * Takes an OcrExtractionResult from either mobile on-device ML Kit or server-side BullMQ fallback
 * and performs structured regex/heuristic extraction for:
 * - Merchant Name (description/note field in transaction)
 * - Total Amount (amount)
 * - Date (transaction date)
 * - Category Suggestion (stretch goal heuristic)
 * - Per-field confidence scores & low-confidence flags
 */
export function parseReceiptOcr(result, options = {}) {
    const { lowConfidenceThreshold = 0.7, categories = DEFAULT_EXPENSE_CATEGORIES, referenceDate = new Date() } = options;
    const rawText = (result.extractedText || "").trim();
    const rawLines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const merchantField = extractMerchant(rawLines, lowConfidenceThreshold);
    const amountField = extractTotalAmount(rawLines, lowConfidenceThreshold);
    const dateField = extractReceiptDate(rawLines, lowConfidenceThreshold, referenceDate);
    const categoryField = suggestCategory(merchantField.value, rawText, categories, lowConfidenceThreshold);
    const lineItems = extractLineItems(rawLines);
    // Compute aggregate confidence across all key fields (merchant, amount, date)
    const keyFieldConfidences = [merchantField.confidence, amountField.confidence, dateField.confidence];
    const fieldsAvg = keyFieldConfidences.reduce((acc, s) => acc + s, 0) / keyFieldConfidences.length;
    const rawOcrConfidence = typeof result.confidence === "number" ? result.confidence : 0.85;
    const overallConfidence = Math.max(0, Math.min(1, Math.round(Math.min(rawOcrConfidence, fieldsAvg) * 100) / 100));
    return {
        merchant: merchantField,
        amount: amountField,
        date: dateField,
        category: categoryField,
        lineItems: lineItems.length > 0 ? lineItems : undefined,
        overallConfidence,
        source: result.source,
        rawText
    };
}
