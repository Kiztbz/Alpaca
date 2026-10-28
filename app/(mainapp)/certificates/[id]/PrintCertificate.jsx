"use client";

export default function PrintCertificate() {
  return <button type="button" onClick={() => window.print()}>Print or save as PDF</button>;
}
