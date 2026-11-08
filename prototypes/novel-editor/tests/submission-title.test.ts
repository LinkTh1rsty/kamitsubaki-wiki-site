import test from "node:test";
import assert from "node:assert/strict";
import { submissionTitleIssue } from "../src/lib/submission-title";

test("submission titles must say what changed", () => {
  for (const [value, issue] of [
    ["", "empty"], ["   ", "empty"], ["更新", "generic"], ["修改", "generic"], ["Update", "generic"],
    ["update kaf.md", "generic"], ["zh.md", "generic"], ["补充", "generic"], ["改一下", "tooShort"],
    ["x".repeat(201), "tooLong"], ["第一行\n第二行", "control"],
  ] as const) assert.equal(submissionTitleIssue(value), issue, value);
  for (const value of ["补充 2024 年活动资料", "Fix KAF debut date", "更新所属组织并补充官方链接"])
    assert.equal(submissionTitleIssue(value), null, value);
});
