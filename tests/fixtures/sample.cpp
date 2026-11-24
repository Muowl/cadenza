#include <string>
#include <vector>

namespace stage {

template <typename T>
concept Playable = requires(T t) { t.play(); };

class Encore final {
public:
    explicit Encore(std::vector<std::string> setlist) : setlist_(std::move(setlist)) {}
    virtual ~Encore() = default;

    [[nodiscard]] auto next() const -> std::optional<std::string> {
        if (setlist_.empty()) return std::nullopt;
        return setlist_.back();
    }

    template <Playable P>
    void play(P& player) noexcept { player.play(); ++round_; }

private:
    static constexpr int kMaxEncores = 3;
    std::vector<std::string> setlist_;
    int round_{0};
};

}  // namespace stage

int main() {
    auto encore = stage::Encore({"Fermata", "Coda"});
    const auto* raw = R"(raw "string")";
    return encore.next().has_value() ? 0 : 1;
}
