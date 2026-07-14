import test from "node:test";
import assert from "node:assert/strict";
import { blogEnhancements, blogPosts } from "../lib/blog-posts";

test("blog slugs and titles are unique", () => {
  assert.equal(new Set(blogPosts.map(({ slug }) => slug)).size, blogPosts.length);
  assert.equal(new Set(blogPosts.map(({ title }) => title)).size, blogPosts.length);
});

test("blog metadata stays within useful search snippet ranges", () => {
  for (const post of blogPosts) {
    assert.ok(post.title.length <= 65, `${post.slug} title is too long`);
    assert.ok(post.description.length >= 120 && post.description.length <= 170, `${post.slug} description length is ${post.description.length}`);
  }
});

test("every blog post has useful structure and internal links", () => {
  for (const post of blogPosts) {
    assert.ok(post.sections.length >= 3);
    assert.ok(post.faq.length >= 2);
    assert.ok(post.relatedPaths.length >= 2);
    assert.ok(post.relatedPaths.every(({ path }) => path.startsWith("/")));
    assert.ok(blogEnhancements[post.slug]?.checklist.length >= 4);
    assert.ok(blogEnhancements[post.slug]?.sources.every(({ url }) => url.startsWith("https://")));
  }
});
