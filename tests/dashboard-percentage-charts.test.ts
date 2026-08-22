import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculatePercentage, formatRatioContext } from "../src/features/dashboard/charts/percentage-charts";

describe("ISCMS — Dashboard Percentage-Based Visualizations & Calculations", () => {
  describe("1. calculatePercentage Accuracy & Edge Cases", () => {
    it("calculates exact whole percentages correctly", () => {
      assert.equal(calculatePercentage(50, 100), "50%");
      assert.equal(calculatePercentage(25, 100), "25%");
      assert.equal(calculatePercentage(82, 100), "82%");
    });

    it("rounds whole percentages cleanly without decimals", () => {
      // 2 / 3 = 66.666% -> 67%
      assert.equal(calculatePercentage(2, 3), "67%");
      // 1 / 3 = 33.333% -> 33%
      assert.equal(calculatePercentage(1, 3), "33%");
      // 1 / 6 = 16.666% -> 17%
      assert.equal(calculatePercentage(1, 6), "17%");
    });

    it("supports 1 decimal place when requested", () => {
      assert.equal(calculatePercentage(1, 3, 1), "33.3%");
      assert.equal(calculatePercentage(2, 3, 1), "66.7%");
      assert.equal(calculatePercentage(975, 1000, 1), "97.5%");
    });

    it("handles zero values and edge cases safely without NaN or division by zero", () => {
      assert.equal(calculatePercentage(0, 100), "0%");
      assert.equal(calculatePercentage(10, 0), "0%");
      assert.equal(calculatePercentage(0, 0), "0%");
      assert.equal(calculatePercentage(-5, 100), "0%");
    });
  });

  describe("2. formatRatioContext Formatting", () => {
    it("formats counts and total with appropriate unit", () => {
      assert.equal(formatRatioContext(45, 100, "students"), "45 of 100 students");
      assert.equal(formatRatioContext(1240, 1250, "dispatches"), "1,240 of 1,250 dispatches");
    });
  });

  describe("3. Distribution Percentage Integrity & Ranking", () => {
    it("calculates accurate shares for multi-category cohorts", () => {
      const data = [
        { name: "Nepal", value: 50 },
        { name: "Nigeria", value: 30 },
        { name: "United Kingdom", value: 20 }
      ];
      const total = data.reduce((sum, d) => sum + d.value, 0);
      assert.equal(total, 100);

      const percentages = data.map(d => calculatePercentage(d.value, total));
      assert.deepEqual(percentages, ["50%", "30%", "20%"]);
    });

    it("handles small cohorts with high precision", () => {
      const data = [
        { name: "Student A", value: 1 },
        { name: "Student B", value: 1 },
        { name: "Student C", value: 1 }
      ];
      const total = 3;
      const percentages = data.map(d => calculatePercentage(d.value, total, 1));
      assert.deepEqual(percentages, ["33.3%", "33.3%", "33.3%"]);
    });
  });

  describe("4. Delivery Success Rate Meter Calculation", () => {
    it("calculates delivery success and failure rates accurately", () => {
      const sent = 98;
      const failed = 2;
      const total = sent + failed;

      const successRate = calculatePercentage(sent, total, 1);
      const failRate = calculatePercentage(failed, total, 1);

      assert.equal(successRate, "98.0%");
      assert.equal(failRate, "2.0%");
    });
  });
});
