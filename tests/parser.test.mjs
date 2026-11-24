import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBounds, extractJson, escapeInputText } from '../jevandroid/src/util.mjs';

test('parseBounds', () => {
  assert.deepEqual(parseBounds('[10,20][110,220]'), {x1:10,y1:20,x2:110,y2:220,cx:60,cy:120});
});

test('extractJson handles fenced json', () => {
  assert.deepEqual(extractJson('```json\n{"action":"CLICK","target":2}\n```'), {action:'CLICK',target:2});
});

test('escapeInputText spaces', () => {
  assert.equal(escapeInputText('hello world'), 'hello%sworld');
});
