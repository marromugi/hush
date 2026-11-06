import Testing

@testable import Features

/// The names here are the ones `src/lib/diary/editorChannel` sends.
struct EditorRequestTests {
  @Test(arguments: [
    (["kind": "ready"], EditorRequest.ready),
    (["kind": "changed", "body": "<p>雪</p>"], .changed(body: "<p>雪</p>")),
    (["kind": "saveImage", "picture": "iVBO"], .saveImage(picture: "iVBO")),
    (["kind": "readImage", "id": "0123"], .readImage(id: "0123")),
    (["kind": "linkPage", "url": "https://example.com"], .linkPage(url: "https://example.com")),
    (
      ["kind": "linkImage", "url": "https://example.com/a.png"],
      .linkImage(url: "https://example.com/a.png")
    ),
    (["kind": "embedPagesOrigin"], .embedPagesOrigin),
  ])
  func eachRequestThePageSendsIsRead(message: [String: String], request: EditorRequest) throws {
    #expect(try EditorRequest(message: message) == request)
  }

  @Test(arguments: [["kind": "changed"], ["kind": "lock"], ["body": "<p>雪</p>"]])
  func aMessageOfAnotherShapeIsRefused(message: [String: String]) {
    #expect(throws: (any Error).self) { try EditorRequest(message: message) }
  }

  @Test func aMessageThatIsNotAnObjectIsRefused() {
    #expect(throws: (any Error).self) { try EditorRequest(message: "ready") }
  }
}
