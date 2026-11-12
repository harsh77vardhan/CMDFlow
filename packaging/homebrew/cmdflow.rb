class Cmdflow < Formula
  desc "Ultra-fast cross-platform command layer on top of Fish, Bash, Zsh, and PowerShell"
  homepage "https://github.com/harsh77vardhan/CMDFlow"
  version "1.0.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-darwin-arm64.tar.gz"
      sha256 "4b68427e90ccf9a65c92c57f7eb0989f668f447cfc3577d61f185ef4ec53cc29"
    else
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-darwin-x86_64.tar.gz"
      sha256 "65bc674f76d49934eef17f1fbc7bb2424cf39a6fb5f096aa26040a4de3a52f82"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.0/cmdflow-linux-x86_64.tar.gz"
      sha256 "8a32bf901c89e248b1d9bf5979ebfe87e7436b76136db6d73507cf2d2de7bc81"
    end
  end

  def install
    bin.install "cmdflow"
  end

  def post_install
    ohai "Run 'cmdflow install' to configure your shell integration."
  end

  test do
    assert_match "cmdflow", shell_output("#{bin}/cmdflow --version")
  end
end
