import AppKit
import Quartz

class IslandView: NSView {
    // MARK: - Constants
    private let collapsedWidth: CGFloat = 200
    private let collapsedHeight: CGFloat = 36
    private let expandedWidth: CGFloat = 360
    private let expandedHeight: CGFloat = 80
    private let cornerRadiusCollapsed: CGFloat = 18
    private let cornerRadiusExpanded: CGFloat = 24
    private let animationDuration: TimeInterval = 0.4

    // MARK: - Subviews
    private let backgroundLayer = CAShapeLayer()
    private let titleLabel = NSTextField(labelWithString: "")
    private let messageLabel = NSTextField(labelWithString: "")

    // MARK: - State
    private(set) var isExpanded = false

    override init(frame frameRect: NSRect) {
        super.init(frame: NSRect(x: 0, y: 0, width: collapsedWidth, height: collapsedHeight))
        setupView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }

    private func setupView() {
        wantsLayer = true
        layer?.backgroundColor = NSColor.clear.cgColor

        // Background pill
        backgroundLayer.fillColor = NSColor.black.withAlphaComponent(0.85).cgColor
        backgroundLayer.cornerRadius = cornerRadiusCollapsed
        backgroundLayer.frame = bounds
        layer?.addSublayer(backgroundLayer)

        // Title label
        titleLabel.font = NSFont.systemFont(ofSize: 13, weight: .semibold)
        titleLabel.textColor = .white
        titleLabel.alignment = .center
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.alphaValue = 0
        addSubview(titleLabel)

        // Message label
        messageLabel.font = NSFont.systemFont(ofSize: 11, weight: .regular)
        messageLabel.textColor = NSColor.white.withAlphaComponent(0.8)
        messageLabel.alignment = .center
        messageLabel.lineBreakMode = .byTruncatingTail
        messageLabel.alphaValue = 0
        addSubview(messageLabel)

        updateLayout()
    }

    private func updateLayout() {
        let w = isExpanded ? expandedWidth : collapsedWidth
        let h = isExpanded ? expandedHeight : collapsedHeight
        frame.size = NSSize(width: w, height: h)
        backgroundLayer.frame = bounds
        backgroundLayer.cornerRadius = isExpanded ? cornerRadiusExpanded : cornerRadiusCollapsed

        if isExpanded {
            let padding: CGFloat = 16
            titleLabel.frame = NSRect(x: padding, y: h - 30, width: w - padding * 2, height: 18)
            messageLabel.frame = NSRect(x: padding, y: 14, width: w - padding * 2, height: 16)
        }
    }

    // MARK: - Expand / Collapse

    func expand(title: String, message: String) {
        titleLabel.stringValue = title
        messageLabel.stringValue = message
        isExpanded = true

        NSAnimationContext.runAnimationGroup { context in
            context.duration = animationDuration
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)

            updateLayout()
            backgroundLayer.frame = bounds
            backgroundLayer.cornerRadius = cornerRadiusExpanded

            self.animator().alphaValue = 1.0
        } completionHandler: {
            self.titleLabel.alphaValue = 1
            self.messageLabel.alphaValue = 1
        }
    }

    func collapse() {
        isExpanded = false
        titleLabel.alphaValue = 0
        messageLabel.alphaValue = 0

        NSAnimationContext.runAnimationGroup { context in
            context.duration = animationDuration
            context.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)

            updateLayout()
            backgroundLayer.frame = bounds
            backgroundLayer.cornerRadius = cornerRadiusCollapsed
        }
    }

    // MARK: - Mouse interaction

    override var acceptsFirstMouse: NSEvent? { return NSEvent() }

    override func mouseDown(with event: NSEvent) {
        // Delegate will handle click-to-focus
        if let window = window as? IslandWindow {
            window.islandViewDidReceiveClick()
        }
    }
}
