#include "TibetPlayOverlay.h"
#include "TibetCameraSettings.h"
#include "TibetGameMode.h"
#include "TibetHUD.h"
#include "Brushes/SlateColorBrush.h"
#include "Fonts/CompositeFont.h"
#include "Fonts/FontMeasure.h"
#include "Framework/Application/SlateApplication.h"
#include "Kismet/KismetSystemLibrary.h"
#include "Misc/Paths.h"
#include "Rendering/DrawElements.h"
#include "Styling/CoreStyle.h"
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
const FLinearColor Ink(FColor(24,35,35,245)), Card(FColor(43,57,55)), Paper(FColor(242,233,210)),
    Muted(FColor(182,189,173)), Gold(FColor(243,197,115)), Jade(FColor(133,220,194)), Faded(FColor(140,147,140));
const FLinearColor SkillInk[] = {Jade,Gold,FColor(151,184,255),FColor(241,190,108),
    FColor(248,164,192),FColor(176,213,151),FColor(210,167,245)};
const FSlateBrush* Tile() { return FCoreStyle::Get().GetBrush("WhiteBrush"); }
const FButtonStyle& FlatButton()
{
    static const FButtonStyle Style=FButtonStyle().SetNormal(*Tile())
        .SetHovered(FSlateColorBrush(FLinearColor(1.2,1.2,1.2)))
        .SetPressed(FSlateColorBrush(FLinearColor(.74,.74,.74)))
        .SetNormalPadding(FMargin(0)).SetPressedPadding(FMargin(0));
    return Style;
}
const FProgressBarStyle& ManaStyle()
{
    static const FProgressBarStyle Style=FProgressBarStyle().SetFillImage(*Tile())
        .SetBackgroundImage(FSlateColorBrush(FLinearColor(FColor(59,76,70))));
    return Style;
}
FText Text(const FString& S) { return FText::FromString(S); }

class SSkillGlyph final : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SSkillGlyph) {} SLATE_ARGUMENT(int32, Slot) SLATE_ATTRIBUTE(FLinearColor, Ink) SLATE_END_ARGS()
    void Construct(const FArguments& A) { Slot=A._Slot; Color=A._Ink; }
    virtual FVector2D ComputeDesiredSize(float) const override { return {28,28}; }
    virtual int32 OnPaint(const FPaintArgs&,const FGeometry& G,const FSlateRect&,FSlateWindowElementList& Out,
        int32 Layer,const FWidgetStyle&,bool) const override
    {
        const auto Size=G.GetLocalSize();
        const float Scale=FMath::Min(Size.X,Size.Y)/24.f;
        const FVector2f Margin((Size.X-24*Scale)/2,(Size.Y-24*Scale)/2);
        auto Stroke=[&](TArray<FVector2f> Points){
            for (auto& P:Points) P=Margin+P*Scale;
            FSlateDrawElement::MakeLines(Out,Layer,G.ToPaintGeometry(),Points,ESlateDrawEffect::None,Color.Get(),true,1.75f);
        };
        switch (Slot)
        {
        case 0: // Light bolt
            Stroke({{14,2},{5,13},{11,13},{9,22},{20,9},{14,9},{16,2}}); break;
        case 1: // Concentric chant waves
            for (int32 I:{0,1,2}) {const float D=I*3; Stroke({{5+D,4+D},{2+D,8+D/2},{2+D,16-D/2},{5+D,20-D}}); Stroke({{19-D,4+D},{22-D,8+D/2},{22-D,16-D/2},{19-D,20-D}});} break;
        case 2: // Ritual dagger
            Stroke({{12,2},{15,5},{12,8},{9,5},{12,2}}); Stroke({{7,10},{17,10},{12,22},{7,10}}); Stroke({{12,8},{12,19}}); break;
        case 3: // Bell and clapper
            Stroke({{11,5},{11,2},{13,2},{13,5},{15,6},{17,9},{18,15},{21,17},{3,17},{6,15},{7,9},{9,6},{11,5}}); Stroke({{10,20},{12,22},{14,20}}); break;
        case 4: // Lotus petals
            Stroke({{12,20},{7,13},{8,8},{12,3},{16,8},{17,13},{12,20}});
            Stroke({{12,20},{5,17},{2,9},{8,11}}); Stroke({{12,20},{19,17},{22,9},{16,11}}); break;
        case 5: // Guardian mask
            Stroke({{3,3},{8,7},{16,7},{21,3},{19,15},{16,19},{12,22},{8,19},{5,15},{3,3}});
            Stroke({{7,10},{10,12}}); Stroke({{17,10},{14,12}}); Stroke({{9,17},{12,15},{15,17}}); break;
        case 6: // Eight-spoked wheel
            { TArray<FVector2f> Ring;
              for (int32 I=0;I<=8;++I) {const float A=I*UE_PI/4; FVector2f P(12+9*FMath::Cos(A),12+9*FMath::Sin(A)); Ring.Add(P); if (I<8) Stroke({{12,12},P});}
              Stroke(MoveTemp(Ring)); } break;
        }
        return Layer;
    }
private:
    int32 Slot=0;
    TAttribute<FLinearColor> Color;
};

class SRouteChart final : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SRouteChart) {} SLATE_ARGUMENT(ATibetGameMode*, Mode) SLATE_ARGUMENT(FSlateFontInfo, Font) SLATE_ATTRIBUTE(float, RowSpacing) SLATE_END_ARGS()
    void Construct(const FArguments& A) { Mode=A._Mode; Font=A._Font; RowSpacing=A._RowSpacing; }
    virtual FVector2D ComputeDesiredSize(float) const override { return {300,4*RowSpacing.Get()}; }
    virtual int32 OnPaint(const FPaintArgs&,const FGeometry& G,const FSlateRect&,FSlateWindowElementList& Out,
        int32 Layer,const FWidgetStyle&,bool) const override
    {
        if (!Mode.IsValid()) return Layer;
        // South branch to the grove, followed by the main pilgrimage in travel order.
        const FIntPoint Cells[]={{1,0},{0,0},{2,0},{2,1},{1,1},{0,1},{0,2},{1,2},{2,2},{2,3},{1,3}};
        const FVector2f Size=G.GetLocalSize();
        auto Pos=[&](int32 I){return FVector2f((Cells[I].X+.5f)*Size.X/3,10+Cells[I].Y*RowSpacing.Get());};
        auto Line=[&](int32 Z,TArray<FVector2f> P,FLinearColor C,float W){
            FSlateDrawElement::MakeLines(Out,Z,G.ToPaintGeometry(),P,ESlateDrawEffect::None,C,true,W);
        };
        for (int32 I=1;I<UE_ARRAY_COUNT(Cells);++I)
        {
            const int32 Previous=I==2 ? 0 : I-1;
            const FVector2f A=Pos(Previous),B=Pos(I);
            const FLinearColor Color=Mode->HasVisitedArea(I) && Mode->HasVisitedArea(Previous) ? Gold : FLinearColor(FColor(99,114,105));
            // Elbow the vertical connectors around labels beneath the waypoints.
            if (A.X==B.X) {const float Offset=Size.X*.12f*(Cells[I].X==0?-1:1); Line(Layer,{A,{A.X+Offset,A.Y},{B.X+Offset,B.Y},B},Color,1.4f);}
            else Line(Layer,{A,B},Color,1.4f);
        }
        auto Measure=FSlateApplication::Get().GetRenderer()->GetFontMeasureService();
        for (int32 I=0;I<UE_ARRAY_COUNT(Cells);++I)
        {
            const bool Here=I==Mode->CurrentAreaIndex(), Visited=Mode->HasVisitedArea(I);
            const FVector2f P=Pos(I);
            const float R=Here?6:4;
            const FLinearColor C=Here?Jade:(Visited?Gold:Muted);
            Line(Layer+1,{{P.X,P.Y-R},{P.X+R,P.Y},{P.X,P.Y+R},{P.X-R,P.Y},{P.X,P.Y-R}},C,Here?3:2);
            if (Here) Line(Layer+1,{{P.X-2,P.Y},{P.X+2,P.Y}},C,3);
            const FString Name=Mode->AreaName(I);
            auto F=Font;
            FVector2D Extent=Measure->Measure(Name,F);
            while (Extent.X>Size.X/3-5 && F.Size>8) { --F.Size; Extent=Measure->Measure(Name,F); }
            const FVector2f Top(P.X-Extent.X/2,P.Y+8);
            const auto Bounds=G.ToPaintGeometry(FVector2f(Extent),FSlateLayoutTransform(Top));
            FSlateDrawElement::MakeBox(Out,Layer+2,Bounds,Tile(),ESlateDrawEffect::None,Card);
            FSlateDrawElement::MakeText(Out,Layer+3,Bounds,Name,F,ESlateDrawEffect::None,C);
        }
        return Layer+3;
    }
private:
    TWeakObjectPtr<ATibetGameMode> Mode;
    FSlateFontInfo Font;
    TAttribute<float> RowSpacing;
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
    SetVisibility(EVisibility::SelfHitTestInvisible);
    Show(ETibetPage::Play);
}
void STibetPlayOverlay::Show(ETibetPage Next)
{
    Page=Next;
    ChildSlot[SNew(SSafeZone).Visibility(EVisibility::SelfHitTestInvisible)
        [SNew(SDPIScaler).Visibility(EVisibility::SelfHitTestInvisible).DPIScale_Lambda([this](){return LayoutScale();})
         [Page==ETibetPage::Play?Play():Journal()]]];
}
FReply STibetPlayOverlay::OnKeyDown(const FGeometry&,const FKeyEvent& Event)
{
    if (Page==ETibetPage::Play) return FReply::Unhandled();
    if (!Event.IsRepeat())
    {
        const FKey Key=Event.GetKey();
        if (Key==EKeys::Escape) HUD->CloseJournal();
        else if (Key==EKeys::M) HUD->ToggleJournal(ETibetPage::Map);
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
        [SNew(SButton).ButtonStyle(&FlatButton()).Tag(Tag).IsFocusable(false).ButtonColorAndOpacity(Highlight?Gold:Card).ContentPadding(FMargin(9,3))
        .HAlign(HAlign_Center).VAlign(VAlign_Center)
        .OnClicked_Lambda([Action](){Action.ExecuteIfBound(); return FReply::Handled();})
        [SNew(STextBlock).Text(Name).Font(Font(14)).ColorAndOpacity(Highlight?Ink:Paper)]];
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
    if (!bTouch) Head->AddSlot().AutoWidth().VAlign(VAlign_Top)[SNew(STextBlock).Font(Font(10)).ColorAndOpacity(Paper)
        .Text_Lambda([this,I](){return Text(Mode->GetSkillState(I).Binding);})];
    Box->AddSlot().AutoHeight()[Head];
    Box->AddSlot().AutoHeight().HAlign(HAlign_Center)[SNew(STextBlock).Font(Font(bTouch?12:14)).ColorAndOpacity(Paper)
        .Text_Lambda([this,En,Zh](){return Local(En,Zh);})];
    Box->AddSlot().AutoHeight().HAlign(HAlign_Center)[SNew(STextBlock).Font(Font(11)).ColorAndOpacity(Muted)
        .Text_Lambda([this,I](){return Text(SkillStatus(I));})];
    return SNew(SButton).ButtonStyle(&FlatButton()).IsFocusable(false).HAlign(HAlign_Fill).ContentPadding(FMargin(2,3))
        .ButtonColorAndOpacity_Lambda([this,I](){const auto S=Mode->GetSkillState(I);
            return S.ActiveRemaining>0?FLinearColor(FColor(43,106,84)):(S.bUnlocked?Card:Ink);})
        .ToolTipText(Title).OnClicked_Lambda([this,I](){Mode->CastSkill(I); return FReply::Handled();})[Box];
}
TSharedRef<SWidget> STibetPlayOverlay::Play()
{
    auto Objective=SNew(SVerticalBox);
    Objective->AddSlot().AutoHeight()[Label(TAttribute<FText>::CreateLambda([this](){return Text(Mode->AreaName());}),19,Gold)];
    Objective->AddSlot().AutoHeight().Padding(0,3)[Label(TAttribute<FText>::CreateLambda([this](){return Text(Mode->GetObjectiveText());}),13,Paper)];
    Objective->AddSlot().AutoHeight()[Label(TAttribute<FText>::CreateLambda([this](){return Text(Mode->Status(bTouch));}),11,Muted)];
    auto Row=SNew(SHorizontalBox);
    for (int32 I=0;I<7;++I) Row->AddSlot().FillWidth(1).Padding(1,0)[SkillSlot(I)];
    auto Bar=SNew(SVerticalBox);
    auto Mana=SNew(SHorizontalBox);
    Mana->AddSlot().AutoWidth().Padding(2,0,9,0)[SNew(STextBlock).Font(Font(10)).ColorAndOpacity(Jade)
        .Text_Lambda([this](){return Text(FString::Printf(TEXT("%s  %d / 100"),*Mode->Local(TEXT("Mantra"),TEXT("法力")),FMath::FloorToInt(Mode->GetMana())));})];
    Mana->AddSlot().VAlign(VAlign_Center)[SNew(SBox).HeightOverride(4)
        [SNew(SProgressBar).Style(&ManaStyle()).Percent_Lambda([this](){return TOptional<float>(Mode->GetMana()/100.f);}).FillColorAndOpacity(Jade).BorderPadding(FVector2D::ZeroVector)]];
    Bar->AddSlot().AutoHeight().Padding(3,0,3,3)[Mana];
    Bar->AddSlot().AutoHeight()[Row];
    auto Nav=SNew(SVerticalBox);
    Nav->AddSlot().AutoHeight()[Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("World map"),TEXT("世界地圖")):Local(TEXT("M  World map"),TEXT("M  世界地圖"));}),
        FSimpleDelegate::CreateLambda([this](){HUD->ToggleJournal(ETibetPage::Map);}),true,TEXT("TibetOpenMap"))];
    Nav->AddSlot().AutoHeight().Padding(0,3,0,0)[Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("Menu"),TEXT("選單")):Local(TEXT("Esc  Menu"),TEXT("Esc  選單"));}),
        FSimpleDelegate::CreateLambda([this](){HUD->ToggleJournal(ETibetPage::Controls);}))];
    auto Root=SNew(SOverlay).Visibility(EVisibility::SelfHitTestInvisible);
    Root->AddSlot().HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(12)
        [SNew(SBox).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Width()*.46f,180.f,390.f));})
         [SNew(SBorder).Visibility(EVisibility::HitTestInvisible).BorderImage(Tile()).BorderBackgroundColor(Ink).Padding(FMargin(12,8))[Objective]]];
    Root->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Top).Padding(12)[Nav];
    Root->AddSlot().HAlign(bTouch?HAlign_Right:HAlign_Center).VAlign(VAlign_Bottom).Padding(8)
        [SNew(SBox).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Min(Width()-32.f,bTouch?455.f:700.f));})
         [SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Ink).Padding(5)[Bar]]];
    if (bTouch)
        Root->AddSlot().HAlign(HAlign_Right).VAlign(VAlign_Bottom).Padding(0,0,12,108)
            [Button(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Act"),TEXT("互動"));}),
                    FSimpleDelegate::CreateLambda([this](){Mode->Interact();}),true)];
    return Root;
}

TSharedRef<SWidget> STibetPlayOverlay::Skills()
{
    auto List=SNew(SVerticalBox);
    for (int32 I=0;I<7;++I)
    {
        auto Row=SNew(SHorizontalBox);
        const auto State=Mode->GetSkillState(I);
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(2,0,10,0)
            [SNew(SSkillGlyph).Slot(I).Ink(State.bUnlocked?SkillInk[I]:Faded)];
        auto Body=SNew(SVerticalBox);
        Body->AddSlot().AutoHeight()[Label(Text(State.Name),15,Paper)];
        Body->AddSlot().AutoHeight()[Label(Text(FString::Printf(TEXT("%s %d   ·   %s %.2g s"),
            *Mode->Local(TEXT("Mantra"),TEXT("法力")),FMath::RoundToInt(State.Cost),
            *Mode->Local(TEXT("Recovery"),TEXT("冷卻")),State.CooldownDuration)),11,Muted)];
        Row->AddSlot().FillWidth(1)[Body];
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(6,0)[Label(Text(State.Binding),12,Gold)];
        Row->AddSlot().AutoWidth().VAlign(VAlign_Center)[Label(Text(SkillStatus(I)),12,State.bUnlocked?Jade:Muted)];
        List->AddSlot().AutoHeight().Padding(0,2)[SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Card).Padding(7)[Row]];
    }
    return List;
}
TSharedRef<SWidget> STibetPlayOverlay::Controls()
{
    auto Box=SNew(SVerticalBox);
    const FText Guide=bTouch
        ? Local(TEXT("Drag the left half to walk and the right half to turn. Tap Act or a ritual to use it."),
                TEXT("左側拖曳移動，右側拖曳轉向。點選「互動」或技能即可使用。"))
        : Local(TEXT("WASD  Move     Right-drag  Look     Shift  Jump\nHold Q / E to orbit, release to follow     Tap E  Interact\nK  Skills     M  World map     Esc  Menu / return"),
                TEXT("WASD 移動　按住滑鼠右鍵拖曳轉向　Shift 跳躍\n按住 Q／E 左右環視，放開回到背後　輕按 E 互動\nK 技能　M 世界地圖　Esc 選單／返回"));
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
    if (!bTouch)
        Box->AddSlot().AutoHeight().HAlign(HAlign_Right).Padding(0,12,0,0)
            [Button(Local(TEXT("Quit game"),TEXT("離開遊戲")),FSimpleDelegate::CreateLambda([this](){
                UKismetSystemLibrary::QuitGame(Mode.Get(),HUD->GetOwningPlayerController(),EQuitPreference::Quit,false);
            }))];
    return Box;
}
TSharedRef<SWidget> STibetPlayOverlay::Journal()
{
    auto Panel=SNew(SVerticalBox);
    auto Head=SNew(SHorizontalBox);
    Head->AddSlot().FillWidth(1).VAlign(VAlign_Center)[Label(Local(TEXT("Pilgrimage journal"),TEXT("朝聖手記")),22,Gold)];
    Head->AddSlot().AutoWidth()[Button(bTouch?Local(TEXT("Return"),TEXT("返回遊戲")):Local(TEXT("Esc  Return"),TEXT("Esc  返回遊戲")),
        FSimpleDelegate::CreateLambda([this](){HUD->CloseJournal();}),false,TEXT("TibetCloseJournal"))];
    Panel->AddSlot().AutoHeight()[Head];
    auto Tabs=SNew(SHorizontalBox);
    auto Tab=[&](ETibetPage Target,FText Title){
        Tabs->AddSlot().FillWidth(1).Padding(2,0)[Button(Title,FSimpleDelegate::CreateLambda([this,Target](){
            if (Page!=Target) HUD->ToggleJournal(Target);
        }),Page==Target)];
    };
    Tab(ETibetPage::Map,Local(TEXT("World map"),TEXT("世界地圖")));
    Tab(ETibetPage::Skills,Local(TEXT("Ritual skills"),TEXT("法術技能")));
    Tab(ETibetPage::Controls,Local(TEXT("Controls"),TEXT("操作設定")));
    Panel->AddSlot().AutoHeight().Padding(0,8)[Tabs];
    auto Body=SNew(SVerticalBox);
    if (Page==ETibetPage::Map)
    {
        Body->AddSlot().AutoHeight()[Label(Text(Mode->Local(TEXT("Here  ·  "),TEXT("目前位置・"))+Mode->AreaName()),17,Jade)];
        Body->AddSlot().AutoHeight().Padding(0,3,0,9)[Label(Text(Mode->GetObjectiveText()),13,Paper)];
        Body->AddSlot().AutoHeight()[SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Card).Padding(4,5)
            [SNew(SRouteChart).Mode(Mode.Get()).Font(Font(12))
                .RowSpacing_Lambda([this](){return Height()<480.f ? 35.f : 50.f;})]];
        auto Legend=SNew(SHorizontalBox);
        Legend->AddSlot().AutoWidth().Padding(0,0,15,0)[Label(Local(TEXT("◆  Here"),TEXT("◆  所在地")),12,Jade)];
        Legend->AddSlot().AutoWidth().Padding(0,0,15,0)[Label(Local(TEXT("◇  Visited"),TEXT("◇  已到訪")),12,Gold)];
        Legend->AddSlot().AutoWidth()[Label(Local(TEXT("◇  Unvisited"),TEXT("◇  尚未到訪")),12,Muted)];
        Body->AddSlot().AutoHeight().Padding(0,7)[Legend];
        Body->AddSlot().AutoHeight()[Label(Local(TEXT("The grove branches south from Boudhanath. After Sky Terma, return through Chimphu to the stupa."),
            TEXT("行者塔林位於博達哈南側支線。完成虛空伏藏後，經青浦返回博達哈。")),12,Muted)];
    }
    else Body->AddSlot().AutoHeight()[Page==ETibetPage::Skills?Skills():Controls()];
    Panel->AddSlot().FillHeight(1)[SNew(SScrollBox)+SScrollBox::Slot()[Body]];
    return SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(FLinearColor(0.008,0.012,0.012,.62))
        .HAlign(HAlign_Center).VAlign(VAlign_Center).Padding(8)
        .OnMouseButtonDown_Lambda([](const FGeometry&,const FPointerEvent&){return FReply::Handled();})
        [SNew(SBox).WidthOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Width()-36.f,250.f,670.f));})
            .HeightOverride_Lambda([this](){return FOptionalSize(FMath::Clamp(Height()-36.f,185.f,Page==ETibetPage::Skills?570.f:485.f));})
            [SNew(SBorder).BorderImage(Tile()).BorderBackgroundColor(Ink).Padding(14)[Panel]]];
}
