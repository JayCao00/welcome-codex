import AppKit
import AVFoundation
import ImageIO

struct Manifest: Decodable { let fps: Int32; let frames: Int; let width: Int; let height: Int }
let directory = URL(fileURLWithPath: CommandLine.arguments[1],isDirectory: true)
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let manifest = try JSONDecoder().decode(Manifest.self,from: Data(contentsOf: directory.appendingPathComponent("manifest.json")))
if FileManager.default.fileExists(atPath: output.path) { try FileManager.default.removeItem(at: output) }
let writer = try AVAssetWriter(outputURL: output,fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video,outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264,AVVideoWidthKey: manifest.width,AVVideoHeightKey: manifest.height,AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 40_000_000,AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input,sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,kCVPixelBufferWidthKey as String: manifest.width,kCVPixelBufferHeightKey as String: manifest.height,kCVPixelBufferCGImageCompatibilityKey as String: true,kCVPixelBufferCGBitmapContextCompatibilityKey as String: true])
writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
for frame in 0..<manifest.frames {
    while !input.isReadyForMoreMediaData {
        guard writer.status == .writing else { fatalError(writer.error?.localizedDescription ?? "Encoder stopped") }
        Thread.sleep(forTimeInterval: 0.002)
    }
    try autoreleasepool {
        let url = directory.appendingPathComponent(String(format: "%06d.png",frame))
        guard let source = CGImageSourceCreateWithURL(url as CFURL,nil),let image = CGImageSourceCreateImageAtIndex(source,0,nil) else { fatalError("Cannot read \(url.path)") }
        var buffer: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil,adaptor.pixelBufferPool!,&buffer)
        let pixel = buffer!; CVPixelBufferLockBaseAddress(pixel,[])
        let context = CGContext(data: CVPixelBufferGetBaseAddress(pixel),width: manifest.width,height: manifest.height,bitsPerComponent: 8,bytesPerRow: CVPixelBufferGetBytesPerRow(pixel),space: CGColorSpaceCreateDeviceRGB(),bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
        context.draw(image,in: CGRect(x: 0,y: 0,width: manifest.width,height: manifest.height))
        CVPixelBufferUnlockBaseAddress(pixel,[])
        guard adaptor.append(pixel,withPresentationTime: CMTime(value: Int64(frame),timescale: manifest.fps)) else { throw writer.error! }
    }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0); writer.finishWriting { done.signal() }; done.wait()
guard writer.status == .completed else { fatalError(writer.error!.localizedDescription) }
print("Saved \(output.path)")
