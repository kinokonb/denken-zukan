// 資料（ユーザーの過去問題集 den3-4sub、Google Drive同期）を読む。本文はrepoに保存しない（出力は画面かscratchpadへ）。
// 使い方（Driveの「オンラインのみ」ファイルを開くのでサンドボックス外で実行する）：
//   swift tools/reference.swift toc   <科目>                  しおり（年度ごとの開始ページ）
//   swift tools/reference.swift pages <科目> <始> <終>         ページの文字
//   swift tools/reference.swift find  <科目> <語>              語が出るページ番号
// 科目は riron / denryoku / kikai / hoki。
import Foundation
import PDFKit

let subjects = ["riron", "denryoku", "kikai", "hoki"]
let args = CommandLine.arguments
guard args.count >= 3, subjects.contains(args[2]) else {
  print("使い方: swift tools/reference.swift toc|pages|find <riron|denryoku|kikai|hoki> ...")
  exit(2)
}

func referencePath(_ subject: String) -> String? {
  let cloud = (NSHomeDirectory() as NSString).appendingPathComponent("Library/CloudStorage")
  let drives = (try? FileManager.default.contentsOfDirectory(atPath: cloud))?.filter { $0.hasPrefix("GoogleDrive-") } ?? []
  for drive in drives {
    let path = "\(cloud)/\(drive)/マイドライブ/den3-4sub_20221011/den3-\(subject)_v1_20221011.pdf"
    if FileManager.default.fileExists(atPath: path) { return path }
  }
  return nil
}

guard let path = referencePath(args[2]), let doc = PDFDocument(url: URL(fileURLWithPath: path)) else {
  print("資料が開けない（Google Drive の同期、またはサンドボックス外での実行を確かめる）")
  exit(1)
}

func pageText(_ number: Int) -> String { doc.page(at: number - 1)?.string ?? "" }

switch args[1] {
case "toc":
  func walk(_ outline: PDFOutline, _ depth: Int) {
    for i in 0..<outline.numberOfChildren {
      guard let child = outline.child(at: i) else { continue }
      let page = child.destination?.page.map { " p\(doc.index(for: $0) + 1)" } ?? ""
      print(String(repeating: "  ", count: depth) + (child.label ?? "") + page)
      walk(child, depth + 1)
    }
  }
  print("pages=\(doc.pageCount)")
  if let root = doc.outlineRoot { walk(root, 0) }
case "pages":
  guard args.count >= 5, let from = Int(args[3]), let to = Int(args[4]) else { exit(2) }
  for number in max(1, from)...min(doc.pageCount, to) { print("[p\(number)]\n\(pageText(number))") }
case "find":
  guard args.count >= 4 else { exit(2) }
  let hits = (1...doc.pageCount).filter { pageText($0).contains(args[3]) }
  print("「\(args[3])」: \(hits.count)ページ " + hits.map { "p\($0)" }.joined(separator: " "))
default:
  exit(2)
}
