class Cmdflow < Formula
  desc "Ultra-fast cross-platform command layer on top of Fish, Bash, Zsh, and PowerShell"
  homepage "https://github.com/harsh77vardhan/CMDFlow"
  version "1.0.3"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-arm64.tar.gz"
      sha256 "59e98451121aa0c0851b338f7aac6de61fe4a4cbf52b0bc1bfa26ae694085c22"
    else
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-x86_64.tar.gz"
      sha256 "daef67d443ea8eb4c38c359acd5088c806cf63df7c2ae509452749b194eb247c"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-linux-x86_64.tar.gz"
      sha256 "88a50d4461ee52494b69b055062f0cf582d6cc9706c6bd413c07b8805a1360a2"
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
