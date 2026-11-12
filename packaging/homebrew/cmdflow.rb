class Cmdflow < Formula
  desc "Ultra-fast cross-platform command layer on top of Fish, Bash, Zsh, and PowerShell"
  homepage "https://github.com/harsh77vardhan/CMDFlow"
  version "1.0.1"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.1/cmdflow-darwin-arm64.tar.gz"
      sha256 "8a403f515b3caf0295e5a6564a05defbdf4f579538e9186c81741957e543cec6"
    else
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.1/cmdflow-darwin-x86_64.tar.gz"
      sha256 "237e8a4780faf1c2c2bb7cde0ccedfcd33893c08d9bb345194eeacf2d775c879"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.1/cmdflow-linux-x86_64.tar.gz"
      sha256 "fef250891182783b99b22e6fd9a654e7562c0a59ad5735b95f7d8c2f91ad3e52"
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
