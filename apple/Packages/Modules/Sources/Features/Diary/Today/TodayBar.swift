import CoreEntrance
import SwiftUI

/// The day being written, how saving stands, and the lock.
struct TodayBar: View {
  let day: Date
  let saveMessage: TodayModel.SaveMessage?
  let locking: Bool
  let onLock: () -> Void

  var body: some View {
    HStack(spacing: 12) {
      Text(day, format: .entryDay)
        .font(.callout)
        .monospacedDigit()
        .foregroundStyle(.secondary)
      Spacer()
      if let saveMessage {
        SaveMessageText(message: saveMessage)
          .multilineTextAlignment(.trailing)
      }
      Button("ロック", action: onLock)
        .disabled(locking)
    }
    .padding(.horizontal)
    .padding(.vertical, 8)
    .background(.bar)
  }
}

/// How saving stands, in words.
private struct SaveMessageText: View {
  let message: TodayModel.SaveMessage

  var body: some View {
    switch message {
    case .saving:
      Text("保存中…").font(.callout).foregroundStyle(.secondary)
    case .saved:
      Text("保存しました").font(.callout).foregroundStyle(.secondary)
    case .failed(let failure):
      FailureText(failure.text)
    }
  }
}

extension FormatStyle where Self == Date.VerbatimFormatStyle {
  /// `2026.11.7`, on the same calendar and in the same time zone as `EntryDate`.
  fileprivate static var entryDay: Date.VerbatimFormatStyle {
    Date.VerbatimFormatStyle(
      format: "\(year: .defaultDigits).\(month: .defaultDigits).\(day: .defaultDigits)",
      timeZone: .current, calendar: Calendar(identifier: .gregorian))
  }
}

#Preview("書いていない日") {
  TodayBar(day: .now, saveMessage: nil, locking: false) {}
}

#Preview("保存中") {
  TodayBar(day: .now, saveMessage: .saving, locking: false) {}
}

#Preview("保存した") {
  TodayBar(day: .now, saveMessage: .saved, locking: false) {}
}

#Preview("保存に失敗した") {
  TodayBar(day: .now, saveMessage: .failed(.unexpected), locking: false) {}
}
