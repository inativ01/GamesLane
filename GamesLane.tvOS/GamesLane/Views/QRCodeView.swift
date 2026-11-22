import CoreImage.CIFilterBuiltins
import SwiftUI

/// A QR code of `text` (Core Image's generator), drawn sharp at any size on a white square.
struct QRCodeView: View {
    let text: String

    var body: some View {
        if let image = Self.image(text) {
            Image(decorative: image, scale: 1)
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .padding(16)
                .background(.white, in: RoundedRectangle(cornerRadius: 16))
        }
    }

    static func image(_ text: String) -> CGImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(text.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage else {
            return nil
        }
        return CIContext().createCGImage(output, from: output.extent)
    }
}
