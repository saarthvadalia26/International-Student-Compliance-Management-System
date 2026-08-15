/**
 * Automated Responsive DatePicker & Collision Detection Test Suite
 * Validates collision math, vertical flip, horizontal right-alignment,
 * viewport clamping, mobile centering, and date arithmetic across screen sizes.
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} - ${failureDetails || "Assertion failed"}`);
    failed++;
  }
}

// Pure implementation of DatePicker positioning logic for unit testing
function calculateDatePickerPosition(params: {
  triggerRect: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  viewportWidth: number;
  viewportHeight: number;
  align?: "left" | "right" | "auto";
  margin?: number;
  verticalGap?: number;
  estimatedHeight?: number;
}) {
  const margin = params.margin ?? 8;
  const verticalGap = params.verticalGap ?? 6;
  const estimatedHeight = params.estimatedHeight ?? 355;
  const targetWidth = Math.min(Math.max(260, params.viewportWidth - (margin * 2)), 310);

  // 1. Vertical Positioning
  const spaceBelow = params.viewportHeight - params.triggerRect.bottom - margin;
  const spaceAbove = params.triggerRect.top - margin;

  let top = 0;
  let isAbove = false;

  if (spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove) {
    top = params.triggerRect.bottom + verticalGap;
    isAbove = false;
    if (top + estimatedHeight > params.viewportHeight - margin) {
      top = Math.max(margin, params.viewportHeight - estimatedHeight - margin);
    }
  } else {
    top = params.triggerRect.top - estimatedHeight - verticalGap;
    isAbove = true;
    if (top < margin) {
      top = margin;
    }
  }

  // 2. Horizontal Positioning
  let left = 0;
  let isCentered = false;

  if (params.viewportWidth <= 440) {
    left = Math.max(margin, (params.viewportWidth - targetWidth) / 2);
    isCentered = true;
  } else {
    const openRightEdge = params.triggerRect.left + targetWidth;
    const overflowsRight = openRightEdge > params.viewportWidth - margin;

    if (params.align === "right" || overflowsRight) {
      left = params.triggerRect.right - targetWidth;
    } else {
      left = params.triggerRect.left;
    }

    left = Math.max(margin, Math.min(left, params.viewportWidth - targetWidth - margin));
  }

  return {
    top: Math.round(top),
    left: Math.round(left),
    width: Math.round(targetWidth),
    right: Math.round(left + targetWidth),
    bottom: Math.round(top + estimatedHeight),
    isAbove,
    isCentered
  };
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  ISCMS RESPONSIVE DATE PICKER POSITIONING TEST SUITE");
  console.log("=======================================================\n");

  // GROUP 1: iPad Portrait (768 x 1024) - Exact User Issue Scenario
  console.log("--- Group 1: iPad Portrait (768 × 1024) Modal Field ---");
  {
    // Right-hand column in a dialog positioned near right side: left = 480px, width = 230px, right = 710px.
    // 480 + 310 = 790px > 760px (768 - 8px margin), which triggers right-edge flip!
    const triggerRect = {
      top: 450,
      bottom: 490,
      left: 480,
      right: 710,
      width: 230,
      height: 40
    };

    const pos = calculateDatePickerPosition({
      triggerRect,
      viewportWidth: 768,
      viewportHeight: 1024
    });

    assert(pos.width === 310, "Target width is 310px on tablet");
    assert(pos.isAbove === false, "Opens below trigger when vertical space allows (spaceBelow = 526px)");
    assert(pos.top === 496, "Top is bottom + 6px (490 + 6 = 496)", `Got: ${pos.top}`);
    assert(pos.right <= 768 - 8, `CRITICAL IPAD FIX: Popover right edge (${pos.right}px) is within screen width (760px)`);
    assert(pos.left >= 8, `Popover left edge (${pos.left}px) is within screen margins`);
    assert(pos.left === 400, "Automatically flipped to align with right edge (710 - 310 = 400)", `Got: ${pos.left}`);
  }

  // GROUP 2: iPad Landscape (1024 x 768)
  console.log("\n--- Group 2: iPad Landscape (1024 × 768) ---");
  {
    // Field near right edge of screen: left = 750, width = 220, right = 970
    const triggerRect = {
      top: 200,
      bottom: 240,
      left: 750,
      right: 970,
      width: 220,
      height: 40
    };

    const pos = calculateDatePickerPosition({
      triggerRect,
      viewportWidth: 1024,
      viewportHeight: 768
    });

    assert(pos.right <= 1024 - 8, `Right edge (${pos.right}px) stays inside 1024px viewport`);
    assert(pos.left === 660, "Aligned right edge (970 - 310 = 660)", `Got: ${pos.left}`);
  }

  // GROUP 3: Vertical Flip (Near Viewport Bottom)
  console.log("\n--- Group 3: Vertical Flip Above Trigger ---");
  {
    // Input at y = 700 on 800px high screen (space below = 800 - 740 = 60px < 355px)
    const triggerRect = {
      top: 700,
      bottom: 740,
      left: 200,
      right: 430,
      width: 230,
      height: 40
    };

    const pos = calculateDatePickerPosition({
      triggerRect,
      viewportWidth: 1280,
      viewportHeight: 800
    });

    assert(pos.isAbove === true, "CRITICAL: Automatically flips to open ABOVE trigger");
    assert(pos.top === 700 - 355 - 6, "Positioned at top - 355 - 6 = 339px", `Got: ${pos.top}`);
    assert(pos.top >= 8, "Top stays above screen margin");
  }

  // GROUP 4: Mobile Viewports (Centering & Fluid Width)
  console.log("\n--- Group 4: Mobile Viewports (360px & 390px) ---");
  {
    // iPhone 14 / standard mobile: 390 x 844
    const triggerRect = {
      top: 300,
      bottom: 340,
      left: 20,
      right: 370,
      width: 350,
      height: 40
    };

    const pos390 = calculateDatePickerPosition({
      triggerRect,
      viewportWidth: 390,
      viewportHeight: 844
    });

    assert(pos390.isCentered === true, "Centered horizontally on mobile (width <= 440px)");
    assert(pos390.width === 310, "Width fits within 390px viewport");
    assert(pos390.left === Math.round((390 - 310) / 2), `Centered left at ${(390 - 310) / 2}px`, `Got: ${pos390.left}`);
    assert(pos390.right <= 390, "Right edge does not clip screen");

    // Narrow mobile: 320 x 568
    const pos320 = calculateDatePickerPosition({
      triggerRect: { top: 200, bottom: 240, left: 16, right: 304, width: 288, height: 40 },
      viewportWidth: 320,
      viewportHeight: 568
    });

    assert(pos320.width === 320 - 16, "Fluid width adapts to 304px on 320px screen", `Got: ${pos320.width}`);
    assert(pos320.left === 8, "Left margin is exactly 8px", `Got: ${pos320.left}`);
    assert(pos320.right === 312, "Right margin is exactly 8px (312px < 320px)", `Got: ${pos320.right}`);
  }

  // GROUP 5: Large Desktop Monitors (1440px, 1920px)
  console.log("\n--- Group 5: Large Desktop Monitors (1440px, 1920px) ---");
  {
    const triggerRect = {
      top: 150,
      bottom: 190,
      left: 300,
      right: 550,
      width: 250,
      height: 40
    };

    const posDesktop = calculateDatePickerPosition({
      triggerRect,
      viewportWidth: 1920,
      viewportHeight: 1080
    });

    assert(posDesktop.isAbove === false, "Opens below trigger on desktop");
    assert(posDesktop.left === 300, "Aligns left by default when sufficient space", `Got: ${posDesktop.left}`);
    assert(posDesktop.width === 310, "Maintains standard enterprise 310px width");
  }

  console.log("\n=======================================================");
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
