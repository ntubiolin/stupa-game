#include "TibetPlayOverlay.h"
#include "TibetAtlas.h"
#include "TibetCameraSettings.h"
#include "TibetCloudSave.h"
#include "TibetGameMode.h"
#include "TibetHUD.h"
#include "Brushes/SlateColorBrush.h"
#include "Engine/Texture2D.h"
#include "Engine/World.h"
#include "Fonts/CompositeFont.h"
#include "Fonts/FontMeasure.h"
#include "Framework/Application/SlateApplication.h"
#include "Kismet/KismetSystemLibrary.h"
#include "Misc/Paths.h"
#include "Rendering/DrawElements.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Images/SImage.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SDPIScaler.h"
#include "Widgets/Layout/SSafeZone.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Notifications/SProgressBar.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SLeafWidget.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
// Tibetan Thangka & Gilded Monastery Lacquer Mineral-Pigment Palette
const FLinearColor Ink(FColor(16, 21, 32, 244)),
    Card(FColor(30, 38, 54, 245)),
    CrimsonLacquer(FColor(102, 28, 26, 238)),
    Paper(FColor(248, 239, 218)),
    Muted(FColor(194, 188, 168)),
    Gold(FColor(238, 189, 98)),
    GoldHairline(FColor(218, 166, 76, 198)),
    InnerHairline(FColor(78, 182, 166, 108)),
    Jade(FColor(88, 222, 194)),
    Coral(FColor(228, 76, 68)),
    Faded(FColor(126, 132, 142));
const FLinearColor SkillInk[] = {
    FColor(92, 224, 232),   // 0 Hum Bolt: Vajra Turquoise
    FColor(246, 196, 98),   // 1 Six-Syllable: Saffron Gold
    FColor(142, 176, 255),  // 2 Phurba: Lapis Indigo
    FColor(244, 186, 96),   // 3 Ghanta Bell: Burnished Bronze
    FColor(248, 148, 184),  // 4 Lotus Shield: Padma Rose
    FColor(138, 232, 196),  // 5 Dharmapala: Tenma Jade
    FColor(238, 164, 248)   // 6 Vajra Guru: Rainbow Thigle
};
const FSlateBrush* Tile() { return FCoreStyle::Get().GetBrush("WhiteBrush"); }
const FButtonStyle& FlatButton()
{
    static const FButtonStyle Style=FButtonStyle().SetNormal(*Tile())
        .SetHovered(FSlateColorBrush(FLinearColor(1.18f,1.14f,1.06f)))
        .SetPressed(FSlateColorBrush(FLinearColor(.76f,.72f,.68f)))
        .SetNormalPadding(FMargin(0)).SetPressedPadding(FMargin(0));
    return Style;
}
const FProgressBarStyle& ManaStyle()
{
    static const FProgressBarStyle Style=FProgressBarStyle().SetFillImage(*Tile())
        .SetBackgroundImage(FSlateColorBrush(FLinearColor(FColor(38, 50, 66, 230))));
    return Style;
}
const FProgressBarStyle& LifeStyle()
{
    static const FProgressBarStyle Style=FProgressBarStyle().SetFillImage(*Tile())
        .SetBackgroundImage(FSlateColorBrush(FLinearColor(FColor(58, 30, 34, 230))));
    return Style;
}
FText Text(const FString& S) { return FText::FromString(S); }

// Custom Tibetan Gilded Lacquer & Endless-Knot Corner Frame ("藏式描金吉祥角花框")
class SThangkaBorder final : public SBorder
{
public:
    SLATE_BEGIN_ARGS(SThangkaBorder)
        : _Background(Ink), _Rim(GoldHairline), _Accent(InnerHairline), _Padding(FMargin(12, 8)), _HeaderBand(false) {}
        SLATE_ARGUMENT(FLinearColor, Background)
        SLATE_ARGUMENT(FLinearColor, Rim)
        SLATE_ARGUMENT(FLinearColor, Accent)
        SLATE_ARGUMENT(FMargin, Padding)
        SLATE_ARGUMENT(bool, HeaderBand)
        SLATE_DEFAULT_SLOT(FArguments, Content)
    SLATE_END_ARGS()

    void Construct(const FArguments& A)
    {
        RimColor = A._Rim;
        AccentColor = A._Accent;
        bHeaderBand = A._HeaderBand;
        SBorder::Construct(SBorder::FArguments()
            .Tag(A._Tag)
            .Visibility(A._Visibility)
            .BorderImage(Tile())
            .BorderBackgroundColor(A._Background)
            .Padding(A._Padding)
            [A._Content.Widget]);
    }

    virtual int32 OnPaint(const FPaintArgs& Args, const FGeometry& Geo, const FSlateRect& Cull,
        FSlateWindowElementList& Out, int32 Layer, const FWidgetStyle& Style, bool bParentEnabled) const override
    {
        const FVector2f S = Geo.GetLocalSize();
        FSlateDrawElement::MakeBox(Out, Layer, Geo.ToPaintGeometry(), Tile(), ESlateDrawEffect::None,
            GetBorderBackgroundColor().GetColor(Style));
        if (bHeaderBand && S.Y > 36.f)
        {
            FSlateDrawElement::MakeBox(Out, Layer + 1,
                Geo.ToPaintGeometry(FVector2f(S.X - 4.f, 32.f), FSlateLayoutTransform(FVector2f(2.f, 2.f))),
                Tile(), ESlateDrawEffect::None, FLinearColor(FColor(106, 28, 26, 128)));
        }
        const int32 ChildLayer = SCompoundWidget::OnPaint(Args, Geo, Cull, Out, Layer + 2, Style, bParentEnabled);
        if (S.X > 16.f && S.Y > 16.f)
        {
            auto DrawRectLines = [&](float Inset, const FLinearColor& Col, float Thick)
            {
                TArray<FVector2f> BoxPts = {
                    {Inset, Inset}, {S.X - Inset, Inset}, {S.X - Inset, S.Y - Inset}, {Inset, S.Y - Inset}, {Inset, Inset}
                };
                FSlateDrawElement::MakeLines(Out, ChildLayer + 1, Geo.ToPaintGeometry(), BoxPts,
                    ESlateDrawEffect::None, Col, true, Thick);
            };
            DrawRectLines(1.0f, RimColor, 1.35f);
            if (S.X > 36.f && S.Y > 36.f)
            {
                DrawRectLines(3.5f, AccentColor, 0.9f);
                // Four Tibetan corner-knot L-flourishes
                const float K = FMath::Min(9.f, FMath::Min(S.X, S.Y) * .18f);
                for (float SX : {0.f, 1.f})
                {
                    for (float SY : {0.f, 1.f})
                    {
                        const auto CornerPt = [&](float DX, float DY)
                        {
                            return FVector2f(SX > .5f ? S.X - DX : DX, SY > .5f ? S.Y - DY : DY);
                        };
                        TArray<FVector2f> Knot = {
                            CornerPt(1.5f, K), CornerPt(K, K), CornerPt(K, 1.5f)
                        };
                        FSlateDrawElement::MakeLines(Out, ChildLayer + 2, Geo.ToPaintGeometry(), Knot,
                            ESlateDrawEffect::None, RimColor, true, 1.15f);
                    }
                }
            }
        }
        return ChildLayer + 2;
    }

private:
    FLinearColor RimColor = GoldHairline;
    FLinearColor AccentColor = InnerHairline;
    bool bHeaderBand = false;
};

class SSkillGlyph final : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SSkillGlyph) {} SLATE_ARGUMENT(int32, Slot) SLATE_ATTRIBUTE(FLinearColor, Ink) SLATE_END_ARGS()
    void Construct(const FArguments& A) { Slot=A._Slot; Color=A._Ink; }
    virtual FVector2D ComputeDesiredSize(float) const override { return {30,30}; }
    virtual int32 OnPaint(const FPaintArgs&,const FGeometry& G,const FSlateRect&,FSlateWindowElementList& Out,
        int32 Layer,const FWidgetStyle&,bool) const override
    {
        const auto Size=G.GetLocalSize();
        const float Scale=FMath::Min(Size.X,Size.Y)/24.f;
        const FVector2f Margin((Size.X-24*Scale)/2,(Size.Y-24*Scale)/2);
        const FLinearColor C = Color.Get();
        // Subtle sacred halo ring behind every ritual glyph
        TArray<FVector2f> Halo;
        for (int32 H=0; H<=16; ++H)
        {
            const float A = H * UE_TWO_PI / 16.f;
            Halo.Add(Margin + FVector2f(12.f + 10.8f * FMath::Cos(A), 12.f + 10.8f * FMath::Sin(A)) * Scale);
        }
        FSlateDrawElement::MakeLines(Out, Layer, G.ToPaintGeometry(), Halo, ESlateDrawEffect::None,
            FLinearColor(C.R, C.G, C.B, C.A * .28f), true, 1.0f);

        auto Stroke=[&](TArray<FVector2f> Points, float Thick = 1.85f){
            for (auto& P:Points) P=Margin+P*Scale;
            FSlateDrawElement::MakeLines(Out,Layer+1,G.ToPaintGeometry(),Points,ESlateDrawEffect::None,C,true,Thick);
        };
        switch (Slot)
        {
        case 0: // Hum Vajra Bolt (5-pronged vajra spearhead + lightning)
            Stroke({{12,2},{7,11},{12,10},{8,22},{18,11},{13,12},{16,2},{12,2}});
            Stroke({{6,6},{12,2},{18,6}}, 1.3f); break;
        case 1: // Six-Syllable Lotus Mantra Wheel
            Stroke({{12,4},{15,9},{20,12},{15,15},{12,20},{9,15},{4,12},{9,9},{12,4}});
            Stroke({{9,9},{15,9},{15,15},{9,15},{9,9}}, 1.25f); break;
        case 2: // Three-Bladed Vajrakilaya Phurba
            Stroke({{12,2},{15,5},{12,8},{9,5},{12,2}});
            Stroke({{6,9},{18,9}});
            Stroke({{8,9},{16,9},{12,22},{8,9}});
            Stroke({{12,8},{12,21}}, 1.35f); break;
        case 3: // Prajna Ghanta Bell & Sonic Waves
            Stroke({{11,5},{12,2},{13,5},{16,7},{17,14},{20,17},{4,17},{7,14},{8,7},{11,5}});
            Stroke({{10,19},{12,21},{14,19}});
            Stroke({{3,8},{2,12},{4,15}}, 1.2f);
            Stroke({{21,8},{22,12},{20,15}}, 1.2f); break;
        case 4: // Sacred Padma Lotus Dome
            Stroke({{12,20},{7,13},{8,7},{12,3},{16,7},{17,13},{12,20}});
            Stroke({{12,20},{4,16},{3,9},{8,10}});
            Stroke({{12,20},{20,16},{21,9},{16,10}});
            Stroke({{6,21},{18,21}}, 1.3f); break;
        case 5: // Five-Peak Dharmapala Crown & Oath Mask
            Stroke({{4,9},{6,4},{9,8},{12,3},{15,8},{18,4},{20,9},{18,17},{12,21},{6,17},{4,9}});
            Stroke({{8,12},{10,13}}); Stroke({{16,12},{14,13}});
            Stroke({{9,17},{12,15},{15,17}}); break;
        case 7: // Amrita Precious Bumpa Vase / Pill Pouch
            Stroke({{9,3},{15,3},{14,7},{18,11},{19,17},{16,21},{8,21},{5,17},{6,11},{10,7},{9,3}});
            Stroke({{8,7},{16,7}});
            Stroke({{10,14},{12,11},{14,14},{12,17},{10,14}}); break;
        case 8: // Five-Pronged Golden Vajra
            Stroke({{12,2},{12,22}});
            Stroke({{7,3},{6,6},{8,9},{12,10},{16,9},{18,6},{17,3}});
            Stroke({{7,21},{6,18},{8,15},{12,14},{16,15},{18,18},{17,21}});
            Stroke({{9,11},{15,11},{15,13},{9,13},{9,11}}); break;
        case 9: // Bronze Ritual Bell
            Stroke({{8,15},{9,8},{11,7},{12,3},{13,7},{15,8},{16,15},{19,18},{5,18},{8,15}});
            Stroke({{10,20},{12,21},{14,20}}); break;
        case 10: // Tibetan Pulu Chuba Robe
            Stroke({{8,3},{4,5},{2,12},{6,14},{8,10},{7,21},{17,21},{16,10},{18,14},{22,12},{20,5},{16,3},{12,6},{8,3}});
            Stroke({{15,4},{9,13},{16,13}}); break;
        case 11: // Thangka Pilgrimage Scroll Map
            Stroke({{2,5},{8,3},{16,5},{22,3},{22,19},{16,21},{8,19},{2,21},{2,5}});
            Stroke({{5,15},{10,10},{14,13},{19,8}}, 1.5f); break;
        case 12: // Lineage Keepsake Hanging Thangka Scroll
            Stroke({{3,3},{21,3}}, 2.2f);
            Stroke({{5,3},{5,20},{19,20},{19,3}});
            Stroke({{3,20},{21,20}}, 2.2f);
            Stroke({{12,7},{14.5f,10.5f},{12,14},{9.5f,10.5f},{12,7}}, 1.5f);
            Stroke({{8,17},{12,15.5f},{16,17}}, 1.4f); break;
        case 6: // Eight-Spoked Golden Dharma Wheel
            { TArray<FVector2f> Ring;
              for (int32 I=0;I<=16;++I) {const float A=I*UE_TWO_PI/16.f; Ring.Add({12+8.8f*FMath::Cos(A),12+8.8f*FMath::Sin(A)});}
              Stroke(MoveTemp(Ring));
              for (int32 I=0;I<8;++I) {const float A=I*UE_PI/4; Stroke({{12,12},{12+8.8f*FMath::Cos(A),12+8.8f*FMath::Sin(A)}}, 1.4f);} } break;
        }
        return Layer+1;
    }
private:
    int32 Slot=0;
    TAttribute<FLinearColor> Color;
};


}

void STibetPlayOverlay::Construct(const FArguments& A)
{
    Mode=A._Mode; HUD=A._HUD; bTouch=A._Touch;
    const FString Fonts=FPaths::EngineContentDir()/TEXT("Slate/Fonts");
    auto Faces=MakeShared<FStandaloneCompositeFont>(TEXT("Regular"),Fonts/TEXT("Roboto-Regular.ttf"),
        EFontHinting::Default,EFontLoadingPolicy::LazyLoad);
    Faces->FallbackTypeface.Typeface=FTypeface(TEXT("Regular"),Fonts/TEXT("DroidSansFallback.ttf"),
        EFontHinting::Default,EFontLoadingPolicy::LazyLoad);
    Typeface=Faces;
    KeepsakeArt.Reset(LoadObject<UTexture2D>(nullptr, TEXT("/Game/Journal/KeepsakeThangka.KeepsakeThangka")));
    if (KeepsakeArt.IsValid())
    {
        KeepsakeBrush.SetResourceObject(KeepsakeArt.Get());
        KeepsakeBrush.ImageSize = FVector2f(1200.f, 1600.f);
        KeepsakeBrush.DrawAs = ESlateBrushDrawType::Image;
    }
    SetVisibility(EVisibility::SelfHitTestInvisible);
    Show(ETibetPage::Play);
}
void STibetPlayOverlay::Show(ETibetPage Next)
{
    Page=Next;
    bConfirmReset=false;
    ChildSlot[SNew(SSafeZone).Visibility(EVisibility::SelfHitTestInvisible)
        [SNew(SDPIScaler).Visibility(EVisibility::SelfHitTestInvisible).DPIScale_Lambda([this](){return LayoutScale();})
         [Page==ETibetPage::Play?Play():Journal()]]];
}
bool STibetPlayOverlay::SupportsKeyboardFocus() const
{
    return Page!=ETibetPage::Play || (Mode.IsValid() && Mode->FeedingPanel()!=0);
}
FReply STibetPlayOverlay::OnKeyDown(const FGeometry&,const FKeyEvent& Event)
{
    if (!SupportsKeyboardFocus()) return FReply::Unhandled();
    if (Mode->FeedingPanel())
    {
        if (Event.IsRepeat()) return FReply::Handled();
        const FKey Key=Event.GetKey();
        const int32 Panel=Mode->FeedingPanel();
        if (Key==EKeys::Escape || Key==EKeys::F) Mode->CloseFeeding();
        else if (Panel==1 && (Key==EKeys::One || Key==EKeys::Enter)) Mode->QuickFeed();
        else if ((Panel==1 && Key==EKeys::Two) || (Panel==3 && (Key==EKeys::One || Key==EKeys::Enter))) Mode->StartFruitGame();
        else if (Panel==2)
        {
            if (Key==EKeys::One) Mode->PickFruit(0);
            else if (Key==EKeys::Two) Mode->PickFruit(1);
            else if (Key==EKeys::Three) Mode->PickFruit(2);
        }
        return FReply::Handled();
    }
    // Letter shortcuts must pass through while the player composes a name or prayer.
    if (Page==ETibetPage::Dedication && Event.GetKey()!=EKeys::Escape)
        if (const auto Fields=DedicationFields.Pin(); Fields && Fields->HasFocusedDescendants()) return FReply::Unhandled();
    if (!Event.IsRepeat())
    {
        const FKey Key=Event.GetKey();
        if (Key==EKeys::Escape) HUD->CloseJournal();
        else if (Key==EKeys::M) HUD->ToggleJournal(ETibetPage::Map);
        else if (Key==EKeys::I) HUD->ToggleJournal(ETibetPage::Pack);
        else if (Key==EKeys::K) HUD->ToggleJournal(ETibetPage::Skills);
    }
    return FReply::Handled();
}
float STibetPlayOverlay::LayoutScale() const
{
    // UE's viewport DPI curve otherwise shrinks a 44-unit control to ~20 px on a 420 px landscape view.
    const float ReferenceHeight=bTouch ? 420.f : 900.f;
    return FMath::Clamp(GetCachedGeometry().GetLocalSize().Y/ReferenceHeight,1.f,3.5f);
}
float STibetPlayOverlay::Width() const { return GetCachedGeometry().GetLocalSize().X/LayoutScale(); }
float STibetPlayOverlay::Height() const { return GetCachedGeometry().GetLocalSize().Y/LayoutScale(); }
FSlateFontInfo STibetPlayOverlay::Font(int32 Size) const { return FSlateFontInfo(Typeface,Size,TEXT("Regular"),FFontOutlineSettings()); }
FText STibetPlayOverlay::Local(const TCHAR* E,const TCHAR* Z) const { return Text(Mode->Local(E,Z)); }
TSharedRef<SWidget> STibetPlayOverlay::Label(TAttribute<FText> V,int32 Size,FLinearColor Color) const
{
    return SNew(STextBlock).Text(V).Font(Font(Size)).ColorAndOpacity(Color).AutoWrapText(true);
}
TSharedRef<SWidget> STibetPlayOverlay::Button(TAttribute<FText> Name,FSimpleDelegate Action,bool Highlight,FName Tag) const
{
    return SNew(SBox).MinDesiredWidth(bTouch?44.f:0.f).MinDesiredHeight(bTouch?44.f:33.f)
        [SNew(SButton).ButtonStyle(&FlatButton()).Tag(Tag).IsFocusable(false)
        .ButtonColorAndOpacity(Highlight?Gold:Card).ContentPadding(FMargin(10,4))
        .HAlign(HAlign_Center).VAlign(VAlign_Center)
        .OnClicked_Lambda([Action](){Action.ExecuteIfBound(); return FReply::Handled();})
        [SNew(STextBlock).Text(Name).Font(Font(14)).ColorAndOpacity(Highlight?FLinearColor(FColor(28,18,12)):Paper)]];
}
FString STibetPlayOverlay::SkillStatus(int32 I) const
{
    const auto S=Mode->GetSkillState(I);
    if (!S.bUnlocked) return Mode->Local(TEXT("Locked"),TEXT("未解鎖"));
    if (S.ActiveRemaining>0) return FString::Printf(TEXT("%s %.0fs"),*Mode->Local(TEXT("Active"),TEXT("生效")),FMath::CeilToFloat(S.ActiveRemaining));
    if (S.CooldownRemaining>0) return FString::Printf(TEXT("%.1fs"),S.CooldownRemaining);
    if (Mode->GetMana()<S.Cost) return Mode->Local(TEXT("Low MP"),TEXT("法力不足"));
    return Mode->Local(TEXT("Ready"),TEXT("可施放"));
}
TSharedRef<SWidget> STibetPlayOverlay::SkillSlot(int32 I)
{
    auto GlyphColor=TAttribute<FLinearColor>::CreateLambda([this,I](){return Mode->GetSkillState(I).bUnlocked?SkillInk[I]:Faded;});
    auto Title=TAttribute<FText>::CreateLambda([this,I](){return Text(Mode->GetSkillState(I).Name);});
    const TCHAR* ShortEn[]={TEXT("Bolt"),TEXT("Mantra"),TEXT("Phurba"),TEXT("Bell"),TEXT("Lotus"),TEXT("Guard"),TEXT("Guru")};
    const TCHAR* ShortZh[]={TEXT("光彈"),TEXT("真言"),TEXT("金剛橛"),TEXT("金剛鈴"),TEXT("蓮盾"),TEXT("護法"),TEXT("上師")};
    const TCHAR* En=ShortEn[I]; const TCHAR* Zh=ShortZh[I];
    auto Box=SNew(SVerticalBox);
    auto Head=SNew(SHorizontalBox);
    Head->AddSlot().FillWidth(1).HAlign(HAlign_Center)[SNew(SSkillGlyph).Slot(I).Ink(GlyphColor)];
    if (!bTouch) Head->AddSlot().AutoWidth().VAlign(VAlign_Top).Padding(0,0,2,0)[SNew(STextBlock).Font(Font(10)).ColorAndOpacity(Gold)
        .Text_Lambda([this,I](){return Text(Mode->GetSkillState(I).Binding);})];
    Box->AddSlot().AutoHeight()[Head];
    Box->AddSlot().AutoHeight().HAlign(HAlign_Center)[SNew(STextBlock).Font(Font(bTouch?12:14)).ColorAndOpacity(Paper)
        .Text_Lambda([this,En,Zh](){return Local(En,Zh);})];
    Box->AddSlot().AutoHeight().HAlign(HAlign_Center)[SNew(STextBlock).Font(Font(11))
        .ColorAndOpacity_Lambda([this,I](){
            const auto S=Mode->GetSkillState(I);
            return FSlateColor(!S.bUnlocked?Faded:(S.CooldownRemaining>0?Gold:(Mode->GetMana()<S.Cost?Coral:Jade)));
        })
        .Text_Lambda([this,I](){return Text(SkillStatus(I));})];
    Box->AddSlot().AutoHeight().Padding(2,2,2,0)[SNew(SBox).HeightOverride(2.5f)
        [SNew(SProgressBar).Style(&ManaStyle()).BorderPadding(FVector2D::ZeroVector)
         .FillColorAndOpacity(SkillInk[I])
         .Percent_Lambda([this,I](){
             const auto S=Mode->GetSkillState(I);
             if (!S.bUnlocked) return TOptional<float>(0.f);
             if (S.CooldownRemaining>0 && S.CooldownDuration>0)
                 return TOptional<float>(1.f - FMath::Clamp(S.CooldownRemaining/S.CooldownDuration, 0.f, 1.f));
             return TOptional<float>(1.f);
         })]];
    return SNew(SButton).ButtonStyle(&FlatButton()).IsFocusable(false).HAlign(HAlign_Fill).ContentPadding(FMargin(3,4,3,2))
        .ButtonColorAndOpacity_Lambda([this,I](){const auto S=Mode->GetSkillState(I);
            return S.ActiveRemaining>0?FLinearColor(FColor(32,96,82)):(S.bUnlocked?Card:FLinearColor(FColor(18,22,30,220)));})
        .ToolTipText(Title).OnClicked_Lambda([this,I](){Mode->CastSkill(I); return FReply::Handled();})[Box];
}
TSharedRef<SWidget> STibetPlayOverlay::Play()
{
    auto Objective=SNew(SVerticalBox);
    Objective->AddSlot().AutoHeight()[Label(TAttribute<FText>::CreateLambda([this](){
        return Text(FString::Printf(TEXT("◆  %s"), *Mode->AreaName()));
    }), 18, Gold)];
    Objective->AddSlot().AutoHeight().Padding(0,5,0,4)
        [SNew(STextBlock).Font(Font(bTouch ? 17 : 19)).AutoWrapText(true)
         .Text_Lambda([this](){return Text(Mode->GetObjectiveText());})
         .ColorAndOpacity_Lambda([this](){
             const float Pulse = Mode->GetPlayerFeedback().ObjectivePulse(Mode->GetWorld()->GetTimeSeconds());
             return FSlateColor(FMath::Lerp(Paper, Gold, Pulse));
         })];
    Objective->AddSlot().AutoHeight()[Label(TAttribute<FText>::CreateLambda([this](){return Text(Mode->Status(bTouch));}),11,Muted)];

    auto Row=SNew(SHorizontalBox);
    for (int32 I=0;I<7;++I) Row->AddSlot().FillWidth(1).Padding(1.5f,0)[SkillSlot(I)];
    Row->AddSlot().FillWidth(1).Padding(6,0,0,0)[QuickSlot()];

    // Dual Vital Meters above the Ritual Bar: Crimson-Coral Life ("體力") + Sacred Turquoise Mantra ("法力")
    auto Meters=SNew(SHorizontalBox);
    auto LifeMeter=SNew(SHorizontalBox);
    LifeMeter->AddSlot().AutoWidth().Padding(2,0,8,0)[SNew(STextBlock).Font(Font(10)).ColorAndOpacity(Coral)
        .Text_Lambda([this](){return Text(FString::Printf(TEXT("%s  %d / %d"),
            *Mode->Local(TEXT("Life"),TEXT("體力")), FMath::CeilToInt(Mode->GetHealth()), int(Mode->MaxHealth())));})];
    LifeMeter->AddSlot().FillWidth(1).VAlign(VAlign_Center)[SNew(SBox).HeightOverride(5)
        [SNew(SProgressBar).Style(&LifeStyle())
         .Percent_Lambda([this](){return TOptional<float>(Mode->GetHealth()/FMath::Max(1.f,Mode->MaxHealth()));})
         .FillColorAndOpacity(Coral).BorderPadding(FVector2D::ZeroVector)]];

    auto ManaMeter=SNew(SHorizontalBox);
    ManaMeter->AddSlot().AutoWidth().Padding(10,0,8,0)[SNew(STextBlock).Font(Font(10)).ColorAndOpacity(Jade)
        .Text_Lambda([this](){return Text(FString::Printf(TEXT("%s  %d / %d"),
            *Mode->Local(TEXT("Mantra"),TEXT("法力")), FMath::FloorToInt(Mode->GetMana()), int(Mode->MaxMana())));})];
    ManaMeter->AddSlot().FillWidth(1).VAlign(VAlign_Center)[SNew(SBox).HeightOverride(5)
        [SNew(SProgressBar).Style(&ManaStyle())
         .Percent_Lambda([this](){return TOptional<float>(Mode->GetMana()/FMath::Max(1.f,Mode->MaxMana()));})
         .FillColorAndOpacity(Jade).BorderPadding(FVector2D::ZeroVector)]];

    Meters->AddSlot().FillWidth(.46f)[LifeMeter];
    Meters->AddSlot().FillWidth(.54f)[ManaMeter];

    auto Bar=SNew(SVerticalBox);
    Bar->AddSlot().AutoHeight().Padding(3,1,3,4)[Meters];
    Bar->AddSlot().AutoHeight()[Row];

    auto Nav=SNew(SVerticalBox);
    Nav->AddSlot().AutoHeight().Padding(0,0,0,4)[CourtyardControls()];
    Nav->AddSlot().AutoHeight()[Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("World map"),TEXT("世界地圖")):Local(TEXT("M  World map"),TEXT("M  世界地圖"));}),
        FSimpleDelegate::CreateLambda([this](){HUD->ToggleJournal(ETibetPage::Map);}),true,TEXT("TibetOpenMap"))];
    Nav->AddSlot().AutoHeight().Padding(0,3,0,0)[Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("Menu"),TEXT("選單")):Local(TEXT("Esc  Menu"),TEXT("Esc  選單"));}),
        FSimpleDelegate::CreateLambda([this](){HUD->ToggleJournal(ETibetPage::Controls);}))];
    Nav->AddSlot().AutoHeight().Padding(0,3,0,0)[Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("Pack"),TEXT("行囊")):Local(TEXT("I  Pack"),TEXT("I  行囊"));}),
        FSimpleDelegate::CreateLambda([this](){HUD->ToggleJournal(ETibetPage::Pack);}),false,TEXT("TibetPack"))];

    auto Root=SNew(SOverlay).Visibility(EVisibility::SelfHitTestInvisible);
    Root->AddSlot().HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(12)
        [SNew(SBox).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Width()*.48f,185.f,432.f));})
         [SNew(SThangkaBorder).Visibility(EVisibility::HitTestInvisible).HeaderBand(true).Padding(FMargin(14,9))[Objective]]];
    Root->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Top).Padding(12)[Nav];

    auto Lower = SNew(SVerticalBox).Visibility(EVisibility::SelfHitTestInvisible);
    auto DialogueCard = SNew(SVerticalBox);
    DialogueCard->AddSlot().AutoHeight()[SNew(STextBlock).Font(Font(bTouch ? 13 : 16)).ColorAndOpacity(Gold)
        .Text_Lambda([this] {
            const FString& Spk = Mode->DialogueSpeaker();
            return Text(Spk.IsEmpty() ? FString() : FString::Printf(TEXT("◆  %s"), *Spk));
        })];
    DialogueCard->AddSlot().AutoHeight().Padding(0,4,0,0)[SNew(STextBlock).Font(Font(bTouch ? 16 : 19))
        .ColorAndOpacity(Paper).AutoWrapText(true).Text_Lambda([this] { return Text(Mode->DialoguePage()); })];
    auto DialogueRow = SNew(SHorizontalBox);
    DialogueRow->AddSlot().FillWidth(1)[DialogueCard];
    DialogueRow->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(10,0,0,0)
        [Button(TAttribute<FText>::CreateLambda([this]{return Local(TEXT("Skip"),TEXT("略過"));}),
            FSimpleDelegate::CreateLambda([this]{Mode->StopDialogue();}))];
    Lower->AddSlot().AutoHeight().HAlign(HAlign_Center).Padding(0,0,0,6)
        [SNew(SBox).Visibility_Lambda([this]{return Mode->DialogueSpeaker().IsEmpty() ? EVisibility::Collapsed : EVisibility::SelfHitTestInvisible;})
         .WidthOverride_Lambda([this]{return FOptionalSize(FMath::Clamp(Width()-(bTouch?165.f:32.f),150.f,690.f));})
         [SNew(SThangkaBorder).Tag(TEXT("TibetDialogue")).HeaderBand(true).Padding(FMargin(15,10))[DialogueRow]]];
    Lower->AddSlot().AutoHeight().HAlign(bTouch?HAlign_Right:HAlign_Center)
        [SNew(SBox).Tag(TEXT("TibetRitualBar")).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Min(Width()-32.f,bTouch?455.f:716.f));})
         [SNew(SThangkaBorder).Padding(FMargin(7,6))[Bar]]];
    Root->AddSlot().HAlign(HAlign_Fill).VAlign(VAlign_Bottom).Padding(8)[Lower];
    if (bTouch)
        Root->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Bottom).Padding(0,0,12,108)
            [Button(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Act"),TEXT("互動"));}),
                    FSimpleDelegate::CreateLambda([this](){Mode->Interact();}),true)];
    Root->AddSlot()[FeedingMenu()];
    return Root;
}

TSharedRef<SWidget> STibetPlayOverlay::Skills()
{
    static const struct { const TCHAR* En; const TCHAR* Zh; } Lore[] = {
        {TEXT("Projects a Hūṃ seed-syllable vajra bolt; restores 2 Mantra on hit."),
         TEXT("投射種子字金剛光彈，命中敵目標時回復 2 點法力。")},
        {TEXT("Unfurls the Six-Syllable Lotus wheel (Oṃ Maṇi Padme Hūṃ) to purify nearby spirits."),
         TEXT("展開觀音六字蓮華真言法輪，震盪並淨化周身逼近之靈障。")},
        {TEXT("Plunges the three-bladed Vajrakilaya phurba from above to shatter fierce obstacles."),
         TEXT("自虛空召請普巴金剛三稜神橛貫穿強敵，破除堅固魔障。")},
        {TEXT("Rings the Prajñā Ghanta ritual bell, sending three sonic Dharma waves forward."),
         TEXT("振響般若金剛鈴音法輪，向前推進三重梵音震退敵影。")},
        {TEXT("Raises a twelve-petal Padma barrier that softens incoming harm for 6 seconds."),
         TEXT("結起十二瓣紅蓮護法結界，持續 6 秒大幅減免所受傷害。")},
        {TEXT("Summons a Twelve Tenma Himalayan snow protector goddess to strike foes."),
         TEXT("召請喜馬拉雅十二丹瑪雪山護法女神現身加持並揮擊強敵。")},
        {TEXT("Intones the Twelve-Syllable Vajra Guru Mantra, manifesting a rainbow mandala."),
         TEXT("持誦十二字蓮師金剛心咒，化現虹光法輪壇城普降威德加持。")},
    };
    auto List=SNew(SVerticalBox);
    for (int32 I=0;I<7;++I)
    {
        auto Row=SNew(SHorizontalBox);
        const auto State=Mode->GetSkillState(I);
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(2,0,12,0)
            [SNew(SSkillGlyph).Slot(I).Ink(State.bUnlocked?SkillInk[I]:Faded)];
        auto Body=SNew(SVerticalBox);
        Body->AddSlot().AutoHeight()[Label(Text(State.Name),15,State.bUnlocked?Paper:Muted)];
        Body->AddSlot().AutoHeight().Padding(0,2)[Label(Local(Lore[I].En, Lore[I].Zh),12,State.bUnlocked?Paper:Faded)];
        Body->AddSlot().AutoHeight()[Label(Text(FString::Printf(TEXT("%s %d   ·   %s %.2g s"),
            *Mode->Local(TEXT("Mantra"),TEXT("法力")),FMath::RoundToInt(State.Cost),
            *Mode->Local(TEXT("Recovery"),TEXT("冷卻")),State.CooldownDuration)),11,Muted)];
        Row->AddSlot().FillWidth(1)[Body];
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(8,0)[Label(Text(State.Binding),13,Gold)];
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center)[Label(Text(SkillStatus(I)),12,State.bUnlocked?Jade:Muted)];
        List->AddSlot().AutoHeight().Padding(0,3)[SNew(SThangkaBorder).Background(State.bUnlocked?Card:Ink).Padding(FMargin(10,8))[Row]];
    }
    return List;
}
TSharedRef<SWidget> STibetPlayOverlay::QuickSlot()
{
    const auto Stack=SNew(SVerticalBox);
    Stack->AddSlot().AutoHeight().HAlign(HAlign_Center)
        [SNew(SSkillGlyph).Slot(Mode->QuickItem()==ETibetItem::Amrita?7:11).Ink(Gold)];
    Stack->AddSlot().AutoHeight().HAlign(HAlign_Center)
        [SNew(STextBlock).Font(Font(bTouch?12:14)).ColorAndOpacity(Paper)
         .Text_Lambda([this](){
             return Mode->QuickItem()==ETibetItem::Amrita
                 ? Local(TEXT("Amrita"),TEXT("甘露丸"))
                 : Local(TEXT("Map"),TEXT("朝聖圖"));
         })];
    Stack->AddSlot().AutoHeight().HAlign(HAlign_Center)
        [SNew(STextBlock).Font(Font(11)).ColorAndOpacity(Gold)
         .Text_Lambda([this](){
             const bool Pills = Mode->QuickItem()==ETibetItem::Amrita;
             const FString Key = bTouch ? FString() : TEXT("X  ");
             return Text(Key + (Pills ? FString::Printf(TEXT("%d / 4"),Mode->Pills()) : Mode->Local(TEXT("Open"),TEXT("展開"))));
         })];
    return SNew(SButton).Tag(TEXT("TibetQuickItem")).ButtonStyle(&FlatButton()).IsFocusable(false)
        .HAlign(HAlign_Fill).ButtonColorAndOpacity(CrimsonLacquer).ContentPadding(FMargin(3,4))
        .OnClicked_Lambda([this](){HUD->UseQuickSlot(); return FReply::Handled();})[Stack];
}

TSharedRef<SWidget> STibetPlayOverlay::Pack()
{
    const auto List=SNew(SVerticalBox);
    const auto Quick=Mode->QuickItem();
    const auto& Active=TibetItemInfo(Quick);
    List->AddSlot().AutoHeight().Padding(0,1,0,6)[Label(Text(FString::Printf(TEXT("%s  %s    ·    %s %d/%d"),
        *Mode->Local(TEXT("Quick item"),TEXT("快捷道具")),*Mode->Local(Active.NameEn,Active.NameZh),
        *Mode->Local(TEXT("Life"),TEXT("體力")),FMath::CeilToInt(Mode->GetHealth()),int(Mode->MaxHealth()))),16,Gold)];
    TArray<ETibetItem> Ordered;
    for (const bool Owned : {true,false})
        for (ETibetItem Item : {ETibetItem::Thangka,ETibetItem::Amrita,ETibetItem::Map,ETibetItem::Vajra,ETibetItem::Bell,ETibetItem::Robe})
            if (Mode->OwnsItem(Item)==Owned) Ordered.Add(Item);
    for (const auto Item : Ordered)
    {
        const int32 I=int32(Item);
        const auto& Info=TibetItemInfo(Item);
        const bool Owned=Mode->OwnsItem(Item), Equipment=Item>=ETibetItem::Vajra && Item<=ETibetItem::Robe;
        const auto Row=SNew(SHorizontalBox);
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(1,0,10,0)[SNew(SSkillGlyph).Slot(7+I).Ink(Owned?Gold:Faded)];
        const auto Copy=SNew(SVerticalBox);
        FString Title=Mode->Local(Info.NameEn,Info.NameZh);
        if (Item==ETibetItem::Amrita) Title+=FString::Printf(TEXT("   %d/4"),Mode->Pills());
        if (Mode->IsEquipped(Item)) Title+=Mode->Local(TEXT("   · Equipped"),TEXT("   ・已裝備"));
        Copy->AddSlot().AutoHeight()[Label(Text(Title),15,Owned?Paper:Muted)];
        Copy->AddSlot().AutoHeight()[Label(Text(Owned?Mode->Local(Info.EffectEn,Info.EffectZh):Mode->Local(Info.SourceEn,Info.SourceZh)),12,Muted)];
        Row->AddSlot().FillWidth(1)[Copy];
        if (Owned)
        {
            if (Item==ETibetItem::Thangka)
            {
                Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(5,0)[Button(Local(TEXT("View Thangka"),TEXT("展開唐卡")),
                    FSimpleDelegate::CreateLambda([this](){ HUD->ToggleJournal(ETibetPage::Thangka); }),
                    true, FName(*FString::Printf(TEXT("TibetPackAction%d"),I)))];
            }
            else
            {
                const bool Selected=Equipment?Mode->IsEquipped(Item):Item==Quick;
                if (!Equipment && Selected)
                {
                    if (Item==ETibetItem::Amrita && Mode->Pills()>0 && Mode->GetHealth()<Mode->MaxHealth())
                    {
                        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(4,0)[Button(Local(TEXT("Use pill"),TEXT("服用")),
                            FSimpleDelegate::CreateLambda([this](){Mode->UsePill(); Show(ETibetPage::Pack);}))];
                    }
                    Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(7,0)[Label(Local(TEXT("Quick slot"),TEXT("快捷中")),12,Jade)];
                }
                else
                {
                    const auto Action=Equipment ? (Selected?Local(TEXT("Remove"),TEXT("卸下")):Local(TEXT("Equip"),TEXT("裝備"))) : Local(TEXT("Set quick"),TEXT("設為快捷"));
                    Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(5,0)[Button(Action,FSimpleDelegate::CreateLambda([this,Item,Equipment](){
                        if (Equipment) Mode->ToggleEquipment(Item);
                        else Mode->SetQuickItem(Item);
                        Show(ETibetPage::Pack);
                    }),false,FName(*FString::Printf(TEXT("TibetPackAction%d"),I)))];
                }
            }
        }
        else
        {
            Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(7,0)[Label(Local(TEXT("Not yet found"),TEXT("尚未取得")),12,Faded)];
        }
        List->AddSlot().AutoHeight().Padding(0,3)[SNew(SThangkaBorder).Background(Owned?Card:Ink).Padding(FMargin(10,8))[Row]];
    }
    return List;
}
TSharedRef<SWidget> STibetPlayOverlay::Controls()
{
    auto Box=SNew(SVerticalBox);
    const FText Guide=bTouch
        ? Local(TEXT("Drag the left half to walk and the right half to turn. Tap Act or a ritual to use it."),
                TEXT("左側拖曳移動，右側拖曳轉向。點選「互動」或技能即可使用。"))
        : Local(TEXT("WASD  Move     Right-drag  Look     Shift  Jump\nHold Q / E to orbit, release to return to your view     Tap E  Interact\nI  Pack     X  Quick item     K  Skills     M  World map     Esc  Menu / return"),
                TEXT("WASD 移動　按住滑鼠右鍵拖曳轉向　Shift 跳躍\n按住 Q／E 左右環視，放開回到原視角　輕按 E 互動\nI 行囊　X 快捷道具　K 技能　M 世界地圖　Esc 選單／返回"));
    Box->AddSlot().AutoHeight().Padding(0,2,0,9)[Label(Guide,13,Paper)];
    auto* Settings=GetMutableDefault<UTibetCameraSettings>();
    auto Row=SNew(SHorizontalBox);
    Row->AddSlot().FillWidth(1).VAlign(VAlign_Center)
        [Label(TAttribute<FText>::CreateLambda([this,Settings](){return Text(FString::Printf(TEXT("%s   %.2g×"),
            *Mode->Local(TEXT("Look sensitivity"),TEXT("視角靈敏度")),Settings->GetSensitivity()));}),14,Paper)];
    for (int32 Sign:{-1,1})
    {
        Row->AddSlot().AutoWidth().Padding(2)[SNew(SBox).MinDesiredWidth(44)
            [Button(Text(Sign<0?TEXT("−"):TEXT("+")),FSimpleDelegate::CreateLambda([Settings,Sign](){
                Settings->SetSensitivity(Settings->GetSensitivity()+.25f*Sign);
            }))]];
    }
    Box->AddSlot().AutoHeight()[SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Card).Padding(6)[Row]];
    Box->AddSlot().AutoHeight().Padding(0,5)[Button(TAttribute<FText>::CreateLambda([this,Settings](){
        return Settings->IsVerticalInverted()?Local(TEXT("Vertical look · Inverted"),TEXT("垂直視角・反轉")):
            Local(TEXT("Vertical look · Normal"),TEXT("垂直視角・正常"));}),
        FSimpleDelegate::CreateLambda([Settings](){Settings->SetVerticalInverted(!Settings->IsVerticalInverted());}))];
    Box->AddSlot().AutoHeight()[Button(Local(TEXT("Language · English / 繁體中文"),TEXT("語言・繁體中文 / English")),
        FSimpleDelegate::CreateLambda([this](){Mode->ChangeLanguage(); Show(ETibetPage::Controls);}))];

    // Save Backup & Google Cloud Sync Card
    auto SaveCard=SNew(SVerticalBox);
    SaveCard->AddSlot().AutoHeight().Padding(0,0,0,4)
        [Label(TAttribute<FText>::CreateLambda([this](){ return Text(Mode->CloudStatusText()); }),12,Jade)];
    auto SaveBtns=SNew(SHorizontalBox);
    SaveBtns->AddSlot().FillWidth(1).Padding(0,0,3,0)[Button(
        Local(TEXT("Save & export JSON"),TEXT("手動存檔並匯出備份")),
        FSimpleDelegate::CreateLambda([this](){ FString P; Mode->SaveNowAndExportBackup(P); }),
        false, TEXT("TibetExportSave"))];
    SaveBtns->AddSlot().FillWidth(1).Padding(3,0,0,0)[Button(
        Local(TEXT("Restore JSON backup"),TEXT("載入備份存檔")),
        FSimpleDelegate::CreateLambda([this](){ FString P; Mode->ImportBackupAndReload(P); }),
        false, TEXT("TibetImportSave"))];
    SaveCard->AddSlot().AutoHeight()[SaveBtns];
    auto CloudRow=SNew(SHorizontalBox);
    CloudRow->AddSlot().FillWidth(1).Padding(0,4,0,0)[Button(
        TAttribute<FText>::CreateLambda([this](){
            return TibetCloudSave::SessionToken().IsEmpty()
                ? Local(TEXT("Google Sign-In & Cloud Save"),TEXT("Google 帳號登入／雲端存檔同步"))
                : Local(TEXT("Sync Cloud Save now"),TEXT("立即同步 Google 雲端存檔"));
        }),
        FSimpleDelegate::CreateLambda([this](){ Mode->SyncCloudSaveNow(false); }),
        false, TEXT("TibetGoogleSync"))];
    if (!TibetCloudSave::SessionToken().IsEmpty())
    {
        CloudRow->AddSlot().AutoWidth().Padding(4,4,0,0)[Button(
            Local(TEXT("Sign out"),TEXT("登出")),
            FSimpleDelegate::CreateLambda([this](){ Mode->SignOutCloudSave(); Show(ETibetPage::Controls); }))];
    }
    SaveCard->AddSlot().AutoHeight()[CloudRow];
    Box->AddSlot().AutoHeight().Padding(0,8,0,0)[SNew(SThangkaBorder).Background(Ink).Padding(FMargin(10,8))[SaveCard]];

    Box->AddSlot().AutoHeight().Padding(0,10,0,0)[SNew(SBox).MinDesiredWidth(bTouch?44.f:0.f).MinDesiredHeight(bTouch?44.f:35.f)
        [SNew(SButton).ButtonStyle(&FlatButton()).Tag(TEXT("TibetResetProgress")).IsFocusable(false)
        .ButtonColorAndOpacity_Lambda([this](){ return bConfirmReset ? Coral : CrimsonLacquer; })
        .ContentPadding(FMargin(10,5)).HAlign(HAlign_Center).VAlign(VAlign_Center)
        .OnClicked_Lambda([this](){
            if (!bConfirmReset) { bConfirmReset = true; return FReply::Handled(); }
            bConfirmReset = false;
            Mode->ResetProgress();
            return FReply::Handled();
        })
        [SNew(STextBlock).Font(Font(14)).ColorAndOpacity(Paper).Text_Lambda([this](){
            return bConfirmReset
                ? Local(TEXT("Confirm reset? Click again to restart at Boudhanath"),TEXT("確認重設進度？（再按一次回到序章博達哈）"))
                : Local(TEXT("Reset pilgrimage progress"),TEXT("重設朝聖進度（從頭開始）"));
        })]]];
    if (!bTouch)
        Box->AddSlot().AutoHeight().HAlign(HAlign_Right).Padding(0,12,0,0)
            [Button(Local(TEXT("Quit game"),TEXT("離開遊戲")),FSimpleDelegate::CreateLambda([this](){
                UKismetSystemLibrary::QuitGame(Mode.Get(),HUD->GetOwningPlayerController(),EQuitPreference::Quit,false);
            }))];
    return Box;
}
TSharedRef<SWidget> STibetPlayOverlay::Thangka()
{
    if (!Mode->OwnsItem(ETibetItem::Thangka))
    {
        auto Locked=SNew(SVerticalBox);
        Locked->AddSlot().AutoHeight().Padding(0,4,0,8)[Label(
            Local(TEXT("◆  Lineage Keepsake Thangka (Locked)"),TEXT("◆  通關紀念唐卡・尚未結緣")),18,Gold)];
        Locked->AddSlot().AutoHeight()[Label(
            Local(TEXT("Complete the five-chapter pilgrimage through Chimphu’s Terma vaults, return to Boudhanath Great Stupa, and step onto the golden lotus mandala to behold Guru Padmasambhava in the sky."),
                  TEXT("完成序章至第五章青朴伏藏秘境的完整朝聖，歸返尼泊爾博達哈大佛塔後，步入佛塔廣場前的金蓮壇城瞻仰虛空蓮師顯相，即可獲贈「行者與蓮師同框」圓滿紀念唐卡。")),14,Paper)];
        return SNew(SThangkaBorder).Background(Card).Padding(FMargin(16,14))[Locked];
    }

    const float ScrollH = FMath::Clamp(Height() - 180.f, 240.f, 440.f);
    const float ScrollW = ScrollH * 0.75f;
    TSharedRef<SWidget> Painting = KeepsakeArt.IsValid()
        ? StaticCastSharedRef<SWidget>(SNew(SImage).Image(&KeepsakeBrush))
        : StaticCastSharedRef<SWidget>(SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Card));

    const auto ScrollFrame = SNew(SBox).WidthOverride(ScrollW).HeightOverride(ScrollH)
        [SNew(SThangkaBorder).Background(Ink).Rim(Gold).Accent(CrimsonLacquer).Padding(FMargin(4))[Painting]];

    const auto Dedications = Mode->Dedications();
    const FString PilgrimName = Dedications.IsEmpty()
        ? Mode->Local(TEXT("Destined Pilgrim"),TEXT("具緣行者"))
        : Dedications.Last().Pilgrim;
    const FString PilgrimPrayer = Dedications.IsEmpty()
        ? Mode->Local(TEXT("May all beings awaken in boundless light."),TEXT("願一切有情離苦得樂，同證菩提。"))
        : Dedications.Last().Prayer;

    auto Colophon = SNew(SVerticalBox);
    Colophon->AddSlot().AutoHeight().Padding(0,0,0,6)[Label(
        Local(TEXT("◆  Guru Padmasambhava & the Pilgrim in Pure Vision"),
              TEXT("◆  蓮師與行者同框・圓滿紀念唐卡")),18,Gold)];
    Colophon->AddSlot().AutoHeight().Padding(0,2,0,10)[Label(
        Local(TEXT("“Never think Padmasambhava dwells far away—wherever pure faith and bodhicitta arise, there shines the Copper-Colored Mountain, and I am never parted from you.”"),
              TEXT("「切莫以為蓮花生遠在異域——凡有清淨信願與菩提心生起之處，即是銅色吉祥山淨土，吾未曾離汝須臾。」")),14,Paper)];
    Colophon->AddSlot().AutoHeight().Padding(0,4,0,8)[SNew(SThangkaBorder).Background(Ink).Padding(FMargin(10,8))
        [Label(Text(FString::Printf(TEXT("%s：%s\n%s：%s\n%s"),
            *Mode->Local(TEXT("Pilgrim"),TEXT("朝聖行者")), *PilgrimName,
            *Mode->Local(TEXT("Dedication Vow"),TEXT("回向祈願")), *PilgrimPrayer,
            *Mode->Local(TEXT("Sacred Sites Completed · 11 / 11 (Boudhanath → Samye → Chimphu Terma → Boudhanath)"),
                         TEXT("聖地巡禮圓滿・11 / 11（博達哈大佛塔 → 桑耶寺 → 青朴伏藏 → 歸返大佛塔）")))),12,Jade)]];

    auto Actions = SNew(SHorizontalBox);
    Actions->AddSlot().AutoWidth().Padding(0,0,6,0)[Button(
        Local(TEXT("Hear Guru’s Blessing"),TEXT("聆聽蓮師開示")),
        FSimpleDelegate::CreateLambda([this](){
            HUD->CloseJournal();
            Mode->SpeakSkyGuruBlessing();
        }), false, TEXT("TibetHearGuruBlessing"))];
    Actions->AddSlot().AutoWidth()[Button(
        Local(TEXT("Save Thangka Image (.png)"),TEXT("匯出紀念唐卡圖檔 (.png)")),
        FSimpleDelegate::CreateLambda([this](){
            FString Saved;
            if (Mode->ExportKeepsakeThangkaPng(Saved))
                ExportedThangkaPath = Mode->Local(TEXT("Saved PNG: "),TEXT("已匯出高清唐卡：")) + Saved;
            else
                ExportedThangkaPath = Mode->Local(TEXT("Could not write PNG file."),TEXT("唐卡圖檔匯出失敗。"));
        }), true, TEXT("TibetExportThangka"))];
    Colophon->AddSlot().AutoHeight().Padding(0,4,0,6)[Actions];
    Colophon->AddSlot().AutoHeight()[Label(
        TAttribute<FText>::CreateLambda([this](){ return Text(ExportedThangkaPath); }),11,Gold)];

    if (Width() < 560.f)
    {
        return SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight().HAlign(HAlign_Center).Padding(0,0,0,10)[ScrollFrame]
            + SVerticalBox::Slot().AutoHeight()[Colophon];
    }
    return SNew(SHorizontalBox)
        + SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Top).Padding(0,0,16,0)[ScrollFrame]
        + SHorizontalBox::Slot().FillWidth(1).VAlign(VAlign_Center)[Colophon];
}
TSharedRef<SWidget> STibetPlayOverlay::Journal()
{
    auto Panel=SNew(SVerticalBox);
    auto Head=SNew(SHorizontalBox);
    Head->AddSlot().FillWidth(1).VAlign(VAlign_Center)[Label(Local(TEXT("◆  Pilgrimage Journal"),TEXT("◆  蓮師朝聖手記")),22,Gold)];
    Head->AddSlot().AutoWidth()[Button(bTouch?Local(TEXT("Return"),TEXT("返回遊戲")):Local(TEXT("Esc  Return"),TEXT("Esc  返回遊戲")),
        FSimpleDelegate::CreateLambda([this](){HUD->CloseJournal();}),false,TEXT("TibetCloseJournal"))];
    Panel->AddSlot().AutoHeight()[Head];
    auto Tabs=SNew(SHorizontalBox);
    auto Tab=[&](ETibetPage Target,FText Title){
        Tabs->AddSlot().FillWidth(1).Padding(2,0)[Button(Title,FSimpleDelegate::CreateLambda([this,Target](){
            if (Page!=Target) HUD->ToggleJournal(Target);
        }),Page==Target,Target==ETibetPage::Pack ? FName(TEXT("TibetPackTab")) : Target==ETibetPage::Thangka ? FName(TEXT("TibetThangkaTab")) : NAME_None)];
    };
    Tab(ETibetPage::Map,Local(TEXT("World map"),TEXT("世界地圖")));
    Tab(ETibetPage::Skills,Local(TEXT("Ritual skills"),TEXT("法術技能")));
    Tab(ETibetPage::Pack,Local(TEXT("Pack"),TEXT("行囊")));
    Tab(ETibetPage::Dedication,Local(TEXT("Dedication"),TEXT("回向")));
    Tab(ETibetPage::Controls,Local(TEXT("Controls"),TEXT("操作設定")));
    if (Mode->OwnsItem(ETibetItem::Thangka) || Page==ETibetPage::Thangka)
        Tab(ETibetPage::Thangka,Local(TEXT("Keepsake"),TEXT("紀念唐卡")));
    Panel->AddSlot().AutoHeight().Padding(0,10)[Tabs];
    auto Body=SNew(SVerticalBox);
    if (Page==ETibetPage::Map)
    {
        Body->AddSlot().AutoHeight()[Label(Text(Mode->Local(TEXT("◆  Here  ·  "),TEXT("◆  目前聖地・"))+Mode->AreaName()),17,Jade)];
        const bool CompactAtlas=bTouch || Height()<500.f;
        if (!CompactAtlas)
            Body->AddSlot().AutoHeight().Padding(0,3,0,9)[Label(Text(Mode->GetObjectiveText()),13,Paper)];
        Body->AddSlot().AutoHeight()[SNew(STibetAtlas).Mode(Mode.Get()).Font(Font(14)).Compact(CompactAtlas)
            .Width(FMath::Min(Width()-68.f,1090.f)).Height(FMath::Clamp(Height()-(CompactAtlas?218.f:195.f),105.f,422.f))];
    }
    else if (Page==ETibetPage::Dedication) Body->AddSlot().AutoHeight()[Dedication()];
    else if (Page==ETibetPage::Thangka) Body->AddSlot().AutoHeight()[Thangka()];
    else Body->AddSlot().AutoHeight()[Page==ETibetPage::Skills?Skills():Page==ETibetPage::Pack?Pack():Controls()];
    Panel->AddSlot().FillHeight(1)[SNew(SScrollBox)+SScrollBox::Slot()[Body]];
    return SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(FLinearColor(0.008f,0.010f,0.018f,.68f))
        .HAlign(HAlign_Center).VAlign(VAlign_Center).Padding(8)
        .OnMouseButtonDown_Lambda([](const FGeometry&,const FPointerEvent&){return FReply::Handled();})
        [SNew(SBox).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Width()-36.f,250.f,(Page==ETibetPage::Map || Page==ETibetPage::Thangka)?1120.f:725.f));})
            .HeightOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Height()-36.f,185.f,(Page==ETibetPage::Map || Page==ETibetPage::Thangka)?635.f:Page==ETibetPage::Skills?605.f:545.f));})
            [SNew(SThangkaBorder).HeaderBand(true).Padding(FMargin(16,14))[Panel]]];
}
