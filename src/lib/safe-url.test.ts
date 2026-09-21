import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSafeUrl } from "./safe-url";

describe("safe-url.ts - SSRF Protection (isSafeUrl)", () => {
  describe("Valid Public URLs", () => {
    it("allows standard public HTTPS URLs", () => {
      assert.equal(isSafeUrl("https://images.unsplash.com/photo-1518770660439-4636190af475"), true);
      assert.equal(isSafeUrl("https://cdn.example.com/assets/video.mp4"), true);
      assert.equal(
        isSafeUrl(
          "https://p16-sign-va.tiktokcdn.com/tos-maliva-p-0068/abc~tplv-photomode-zoomcover:720:720.jpeg",
        ),
        true,
      );
    });

    it("allows public HTTP URLs", () => {
      assert.equal(isSafeUrl("http://example.com/test.jpg"), true);
    });

    it("allows public IP addresses", () => {
      assert.equal(isSafeUrl("http://8.8.8.8/dns-query"), true);
      assert.equal(isSafeUrl("https://1.1.1.1/"), true);
    });
  });

  describe("Invalid & Non-HTTP Protocols", () => {
    it("rejects non-url strings", () => {
      assert.equal(isSafeUrl("not-a-url"), false);
      assert.equal(isSafeUrl(""), false);
      assert.equal(isSafeUrl("   "), false);
    });

    it("rejects dangerous or unsupported schemes (ftp, file, javascript)", () => {
      assert.equal(isSafeUrl("file:///etc/passwd"), false);
      assert.equal(isSafeUrl("ftp://ftp.example.com/file"), false);
      assert.equal(isSafeUrl("javascript:alert(1)"), false);
      assert.equal(isSafeUrl("data:text/html,<h1>test</h1>"), false);
    });
  });

  describe("Blocked SSRF Targets (Loopback & Metadata)", () => {
    it("blocks localhost variants", () => {
      assert.equal(isSafeUrl("http://localhost/admin"), false);
      assert.equal(isSafeUrl("http://localhost:3000/api/ai"), false);
      assert.equal(isSafeUrl("https://app.localhost/"), false);
    });

    it("blocks 127.0.0.1 and 0.0.0.0 loopback", () => {
      assert.equal(isSafeUrl("http://127.0.0.1/"), false);
      assert.equal(isSafeUrl("http://127.0.0.1:8080/metrics"), false);
      assert.equal(isSafeUrl("http://0.0.0.0/"), false);
    });

    it("blocks IPv6 loopback [::1]", () => {
      assert.equal(isSafeUrl("http://[::1]/"), false);
      assert.equal(isSafeUrl("http://[::1]:3000/"), false);
    });

    it("blocks cloud instance metadata service (169.254.169.254 and metadata.google.internal)", () => {
      assert.equal(isSafeUrl("http://169.254.169.254/computeMetadata/v1/"), false);
      assert.equal(isSafeUrl("http://metadata.google.internal/computeMetadata/v1/instance"), false);
    });

    it("blocks internal and local TLDs", () => {
      assert.equal(isSafeUrl("http://service.internal/api"), false);
      assert.equal(isSafeUrl("http://router.local/status"), false);
    });
  });

  describe("Blocked Private RFC 1918 IPv4 Ranges", () => {
    it("blocks 10.0.0.0/8 private network", () => {
      assert.equal(isSafeUrl("http://10.0.0.1/"), false);
      assert.equal(isSafeUrl("http://10.255.255.255/"), false);
    });

    it("blocks 192.168.0.0/16 private network", () => {
      assert.equal(isSafeUrl("http://192.168.1.1/"), false);
      assert.equal(isSafeUrl("http://192.168.0.254/"), false);
    });

    it("blocks 172.16.0.0/12 private network", () => {
      assert.equal(isSafeUrl("http://172.16.0.1/"), false);
      assert.equal(isSafeUrl("http://172.24.1.1/"), false);
      assert.equal(isSafeUrl("http://172.31.255.255/"), false);
    });

    it("blocks carrier-grade NAT (100.64.0.0/10) and multicast (224.0.0.0+)", () => {
      assert.equal(isSafeUrl("http://100.64.0.1/"), false);
      assert.equal(isSafeUrl("http://224.0.0.1/"), false);
    });
  });
});
