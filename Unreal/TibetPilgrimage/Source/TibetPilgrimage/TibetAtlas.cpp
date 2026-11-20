#include "TibetAtlas.h"
#include "TibetGameMode.h"
#include "Engine/Texture2D.h"
#include "Styling/CoreStyle.h"
#include "Rendering/DrawElements.h"
#include "Widgets/Images/SImage.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SConstraintCanvas.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SLeafWidget.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
struct FAtlasNode { float X, Y; const TCHAR *En, *Zh, *DetailEn, *DetailZh; };
#include "TibetAtlasNodes.inl"

const FLinearColor Gold(FColor(242,195,95)), Jade(FColor(128,233,203)), Paper(FColor(246,228,197));
const FLinearColor Ink(FColor(45,34,32));
const FButtonStyle& PinStyle()
{
    static const FSlateBrush Tile = *FCoreStyle::Get().GetBrush("WhiteBrush");
    static const auto S = FButtonStyle().SetNormal(Tile).SetHovered(Tile).SetPressed(Tile);
    return S;
}

class SAtlasTrails final : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SAtlasTrails) {} SLATE_ARGUMENT(ATibetGameMode*, Mode) SLATE_END_ARGS()
    void Construct(const FArguments& A) { Mode=A._Mode; SetVisibility(EVisibility::HitTestInvisible); }
    virtual FVector2D ComputeDesiredSize(float) const override { return {1,1}; }
    virtual int32 OnPaint(const FPaintArgs&, const FGeometry& G, const FSlateRect&, FSlateWindowElementList& Out,
                          int32 Layer, const FWidgetStyle&, bool) const override
    {
        if (!Mode.IsValid()) return Layer;
        const auto Size = G.GetLocalSize();
        auto Point = [&](int32 I){ return FVector2f(AtlasNodes[I].X * Size.X, AtlasNodes[I].Y * Size.Y); };
        for (const auto& Edge : AtlasEdges)
        {
            const FVector2f A = Point(Edge.X), B = Point(Edge.Y);
            const bool Visited = Mode->HasVisitedArea(Edge.X) && Mode->HasVisitedArea(Edge.Y);
            TArray<FVector2f> Points;
            for (int32 I=0; I<=16; ++I)
            {
                const float T = I/16.f;
                Points.Add(FMath::Lerp(A,B,T) - FVector2f(0, 4*T*(1-T)*Size.Y*.035f));
            }
            FSlateDrawElement::MakeLines(Out,Layer,G.ToPaintGeometry(),Points,ESlateDrawEffect::None,Ink,true,4);
            FSlateDrawElement::MakeLines(Out,Layer+1,G.ToPaintGeometry(),Points,ESlateDrawEffect::None,
                Visited ? Gold : FLinearColor(FColor(217,190,145)),true,1.6);
        }
        return Layer+1;
    }
private:
    TWeakObjectPtr<ATibetGameMode> Mode;
};
}

void STibetAtlas::Construct(const FArguments& Args)
{
    Mode = Args._Mode;
    const bool Compact = Args._Compact;
    Selected = FMath::Clamp(Mode->CurrentAreaIndex(), 0, 8);
    Texture.Reset(LoadObject<UTexture2D>(nullptr, TEXT("/Game/Journal/PilgrimageAtlas.PilgrimageAtlas")));
    Illustration.SetResourceObject(Texture.Get());
    Illustration.ImageSize = FVector2f(1600,900);
    Illustration.DrawAs = ESlateBrushDrawType::Image;
    const auto Pins = SNew(SConstraintCanvas);
    const TCHAR* ShortEn[] = { TEXT("Boudhanath"),TEXT("Grove"),TEXT("Wilds"),TEXT("Pharping"),TEXT("Mangyul"),
        TEXT("Yarlung"),TEXT("Samye"),TEXT("Chimphu"),TEXT("Terma") };
    auto PinFont=Args._Font;
    PinFont.Size = Compact ? 11 : 14;
    for (int32 I=0; I<UE_ARRAY_COUNT(AtlasNodes); ++I)
    {
        const auto& Node = AtlasNodes[I];
        const bool Here = FMath::Min(Mode->CurrentAreaIndex(),8)==I;
        const bool Visited = Mode->HasVisitedArea(I) || Here;
        const FString Name=Mode->Local(ShortEn[I],Node.Zh);
        const FString Caption=(Here ? TEXT("◆ ") : Visited ? TEXT("◇ ") : TEXT("· ")) + Name;
        auto Pin=SNew(SButton).Tag(FName(*FString::Printf(TEXT("TibetAtlas%d"),I))).ButtonStyle(&PinStyle())
            .ContentPadding(0).IsFocusable(false).HAlign(HAlign_Center).VAlign(VAlign_Top)
            .ButtonColorAndOpacity(FLinearColor::Transparent)
            .OnClicked_Lambda([this,I](){Selected=I; bWriteFailed=false; return FReply::Handled();})
            [SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).Padding(FMargin(Compact?4:8,2))
                .BorderBackgroundColor_Lambda([this,I](){return Selected==I ? FLinearColor(FColor(109,53,30)) : Ink;})
                [SNew(STextBlock).Font(PinFont).Text(FText::FromString(Caption)).ColorAndOpacity(Here?Jade:Visited?Gold:Paper)]];
        Pins->AddSlot().Anchors(FAnchors(Node.X,Node.Y)).Offset(FMargin(0)).Alignment(FVector2D(.5,0)).AutoSize(true)
            [SNew(SBox).MinDesiredWidth(44).MinDesiredHeight(Compact?44:27)[Pin]];
    }
    const auto Picture=SNew(SOverlay)
        + SOverlay::Slot()[SNew(SImage).Image(&Illustration).Visibility(EVisibility::HitTestInvisible)]
        + SOverlay::Slot()[SNew(SAtlasTrails).Mode(Mode.Get())]
        + SOverlay::Slot()[Pins];
    auto TitleFont=Args._Font;
    TitleFont.Size=Compact?14:18;
    auto DetailFont=Args._Font;
    DetailFont.Size=Compact?12:15;
    const auto Detail = SNew(SVerticalBox);
    Detail->AddSlot().AutoHeight()[SNew(STextBlock).Tag(TEXT("TibetAtlasSelection")).Font(TitleFont)
        .ColorAndOpacity(Gold).AutoWrapText(true).Text_Lambda([this](){const auto& N=AtlasNodes[Selected]; return FText::FromString(Mode->Local(N.En,N.Zh));})];
    Detail->AddSlot().AutoHeight().Padding(0,2,0,0)[SNew(STextBlock).Font(DetailFont).ColorAndOpacity(Jade).AutoWrapText(true)
        .Text_Lambda([this](){return FText::FromString(SelectedLegend());})];
    Detail->AddSlot().AutoHeight().Padding(0,6,0,9)[SNew(STextBlock).Font(DetailFont).ColorAndOpacity(Paper).AutoWrapText(true)
        .Text_Lambda([this](){const auto& N=AtlasNodes[Selected];return FText::FromString(Mode->Local(N.DetailEn,N.DetailZh));})];
    Detail->AddSlot().AutoHeight()[SNew(STextBlock).Font(DetailFont).ColorAndOpacity(Jade).AutoWrapText(true)
        .Text(FText::FromString(Mode->Local(TEXT("◆ Here   ◇ Visited   · Unvisited"),TEXT("◆ 所在地　◇ 已到訪　· 尚未到訪"))))];
    Detail->AddSlot().AutoHeight().Padding(0,8,0,0)[SNew(SButton).Tag(TEXT("TibetAtlasTravel"))
        .Visibility_Lambda([this](){return Mode.IsValid() && Mode->CanTravelFromAtlas(Selected) ? EVisibility::Visible : EVisibility::Collapsed;})
        .ContentPadding(FMargin(10,5)).HAlign(HAlign_Center)
        .OnClicked_Lambda([this](){
            if (Mode.IsValid() && !Mode->TravelFromAtlas(Selected)) bWriteFailed = true;
            return FReply::Handled();
        })
        [SNew(STextBlock).Font(TitleFont).ColorAndOpacity(Ink)
            .Text(FText::FromString(Mode->Local(TEXT("Travel here"),TEXT("傳送到此地"))))]];
    // Keep the original 16:9 painting intact and dock the selected place beside it.
    const bool Stack=Args._Width<490;
    const float ChartWidth=FMath::Max(200.f,FMath::Min(Stack?Args._Width:Args._Width*.73f,Args._Height*16.f/9.f));
    const auto Board=SNew(SBox).WidthOverride(ChartWidth).HeightOverride(ChartWidth*9.f/16.f)[Picture];
    if (Stack)
        ChildSlot[SNew(SVerticalBox)+SVerticalBox::Slot().AutoHeight()[Board]
            +SVerticalBox::Slot().AutoHeight().Padding(0,6)[Detail]];
    else
        ChildSlot[SNew(SHorizontalBox)+SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Top)[Board]
            +SHorizontalBox::Slot().FillWidth(1).VAlign(VAlign_Center).Padding(Compact?9:18,2,2,2)[Detail]];
}
FString STibetAtlas::SelectedLegend() const
{
    const int32 Current=Mode->CurrentAreaIndex();
    if (bWriteFailed) return Mode->Local(TEXT("Could not save progress. Try again."),TEXT("進度無法儲存，請重試。"));
    FString Status = Mode->Local(TEXT("Follow the pilgrimage to visit and unlock travel."),TEXT("請沿主線首次抵達此地，即可解鎖傳送。"));
    if (Selected == FMath::Min(Current,8)) Status = Mode->Local(TEXT("You are here"),TEXT("目前所在"));
    else if (Mode->CanTravelFromAtlas(Selected)) Status = Mode->Local(TEXT("Travel available"),TEXT("可傳送"));
    if (Selected==8 && Current>=8) Status=Mode->AreaName() + TEXT(" · ") + Status;
    return Status;
}
