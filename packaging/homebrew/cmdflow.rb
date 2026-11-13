class Cmdflow < Formula
  desc "Ultra-fast cross-platform command layer on top of Fish, Bash, Zsh, and PowerShell"
  homepage "https://github.com/harsh77vardhan/CMDFlow"
  version "1.0.3"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-arm64.tar.gz"
      sha256 "919bfda5ddfa61b2ca5f0cc63180b849dce9c79b4e658016733c80979cf6a801"
    else
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-darwin-x86_64.tar.gz"
      sha256 "3111da46b793ed1d282772c593b6e9fe4b961aed2af70cd96965f2f3376e990a"
    end
  end

  on_linux do
    if Hardware::CPU.intel?
      url "https://github.com/harsh77vardhan/CMDFlow/releases/download/v1.0.3/cmdflow-linux-x86_64.tar.gz"
      sha256 "60b6e0d535cb8d6407a8ad269ccaafe13b6841fc4270feb220103ad26c7e3872"
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
