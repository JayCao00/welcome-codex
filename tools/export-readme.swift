import AVFoundation
import ImageIO
import UniformTypeIdentifiers

let asset = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 800, height: 450)
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
let fps = 12.0
let count = Int(ceil(CMTimeGetSeconds(asset.duration) * fps))
guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.gif.identifier as CFString, count, nil) else {
    fatalError("Cannot create GIF destination")
}
CGImageDestinationSetProperties(destination, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
for index in 0..<count {
    let frame = try generator.copyCGImage(at: CMTime(seconds: Double(index) / fps, preferredTimescale: 600), actualTime: nil)
    CGImageDestinationAddImage(destination, frame, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: 1 / fps]] as CFDictionary)
}
guard CGImageDestinationFinalize(destination) else { fatalError("GIF export failed") }
print("Exported \(count) frames to \(output.path)")
