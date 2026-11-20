#include "TibetPlayOverlay.h"
#include "TibetGameMode.h"
#include "Styling/CoreStyle.h"
#include "Framework/Application/SlateApplication.h"
#include "Widgets/Input/SSlider.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
const FLinearColor TimePanel(FColor(27,37,37,245)), Cream(FColor(248,231,193));
const FSlateBrush* PanelBrush() {return FCoreStyle::Get().GetBrush("WhiteBrush");}
}
TSharedRef<SWidget> STibetPlayOverlay::CourtyardControls()
{
    auto Content=SNew(SVerticalBox);
    Content->AddSlot().AutoHeight().HAlign(HAlign_Fill)
        [SNew(STextBlock).Text_Lambda([this](){return FText::FromString(Mode->TimeLabel());})
         .Font(Font(14)).ColorAndOpacity(Cream).AutoWrapText(false).Justification(ETextJustify::Center)];
    auto Rates=SNew(SHorizontalBox);
    const int32 Values[]={0,1,4};
    const FName Tags[]={TEXT("TibetClockPause"),TEXT("TibetClockNormal"),TEXT("TibetClockFast")};
    for(int32 I=0;I<3;++I)
    {
        const int32 Rate=Values[I];
        const FText Caption=Rate?FText::FromString(FString::Printf(TEXT("%d×"),Rate)):FText::FromString(TEXT("Ⅱ"));
        const TAttribute<FText> Description=TAttribute<FText>::CreateLambda([this,Rate,Caption](){
            return Rate?Caption:Local(TEXT("Pause"),TEXT("暫停"));});
        Rates->AddSlot().FillWidth(1).Padding(1,1)[SNew(SBox).MinDesiredHeight(bTouch?44.f:30.f)
            [SNew(SBorder).BorderImage(PanelBrush()).Padding(0)
             .BorderBackgroundColor_Lambda([this,Rate](){return Mode->ClockRate()==Rate?
                 FLinearColor(FColor(244,197,112)):FLinearColor(FColor(48,64,63));})
             [SNew(SButton).ButtonStyle(&FCoreStyle::Get().GetWidgetStyle<FButtonStyle>("NoBorder"))
              .Tag(Tags[I]).IsFocusable(false).HAlign(HAlign_Center).VAlign(VAlign_Center)
              .ContentPadding(0).ToolTipText(Description).AccessibleText(Description)
              .OnClicked_Lambda([this,Rate](){Mode->SetClockRate(Rate);return FReply::Handled();})
              [SNew(STextBlock).Text(Caption).Font(Font(14)).AutoWrapText(false)
               .ColorAndOpacity_Lambda([this,Rate](){return FSlateColor(Mode->ClockRate()==Rate?
                   FLinearColor(FColor(31,39,38)):Cream);})]]]];
    }
    Content->AddSlot().AutoHeight()[Rates];
    Content->AddSlot().AutoHeight().Padding(5,2)
        [SNew(SSlider).Tag(TEXT("TibetClockSlider")).StepSize(.002f)
         .Value_Lambda([this](){return Mode->SolarPhase();})
         .ToolTipText(Local(TEXT("Time of day"),TEXT("市區時刻")))
         .OnValueChanged_Lambda([this](float V){Mode->SetSolarPhase(V,false);})
         .OnMouseCaptureEnd_Lambda([this](){Mode->SetSolarPhase(Mode->SolarPhase());})
         .OnControllerCaptureEnd_Lambda([this](){Mode->SetSolarPhase(Mode->SolarPhase());})];
    Content->AddSlot().AutoHeight()[SNew(SBox).Visibility_Lambda([this](){
        return Mode->CanFeed() && !Mode->FeedingPanel()?EVisibility::Visible:EVisibility::Collapsed;})
        [Button(TAttribute<FText>::CreateLambda([this](){return (bTouch || Mode->AtButterLamp())?Local(TEXT("Feed macaque"),TEXT("餵獼猴")):
            Local(TEXT("F  Feed macaque"),TEXT("F  餵獼猴"));}),
            FSimpleDelegate::CreateLambda([this](){Mode->BeginFeeding();}),true,TEXT("TibetFeedMacaque"))]];
    Content->AddSlot().AutoHeight()[SNew(SBox).Visibility_Lambda([this](){
        return Mode->AtButterLamp() && !Mode->FeedingPanel()?EVisibility::Visible:EVisibility::Collapsed;})
        [Button(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Light & dedicate"),TEXT("點燈回向"));}),
            FSimpleDelegate::CreateLambda([this](){Mode->OfferNearbyLamp();}),true,TEXT("TibetOfferLamp"))]];
    return SNew(SBox).WidthOverride(bTouch?163.f:190.f)
        [SNew(SBorder).BorderImage(PanelBrush()).BorderBackgroundColor(TimePanel).Padding(4)[Content]];
}

TSharedRef<SWidget> STibetPlayOverlay::FeedingMenu()
{
    auto Column=SNew(SVerticalBox);
    Column->AddSlot().AutoHeight()[Label(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Feed the macaque"),TEXT("餵獼猴"));}),22,Cream)];
    Column->AddSlot().AutoHeight().Padding(0,8)
        [Label(TAttribute<FText>::CreateLambda([this](){return FText::FromString(Mode->FeedingText());}),16,Cream)];
    auto Action=[this,&Column](int32 Panel,const TCHAR* En,const TCHAR* Zh,FSimpleDelegate Callback,FName Tag){
        Column->AddSlot().AutoHeight().Padding(0,2)
            [SNew(SBox).Visibility_Lambda([this,Panel](){return Mode->FeedingPanel()==Panel?EVisibility::Visible:EVisibility::Collapsed;})
            [Button(TAttribute<FText>::CreateLambda([this,En,Zh](){return Local(En,Zh);}),Callback,false,Tag)]];
    };
    Action(1,bTouch?TEXT("Offer a banana"):TEXT("1  Offer a banana"),bTouch?TEXT("直接餵香蕉"):TEXT("1  直接餵香蕉"),FSimpleDelegate::CreateLambda([this](){Mode->QuickFeed();}),TEXT("TibetQuickFeed"));
    Action(1,bTouch?TEXT("Match five fruits"):TEXT("2  Match five fruits"),bTouch?TEXT("挑戰五輪配對"):TEXT("2  挑戰五輪配對"),FSimpleDelegate::CreateLambda([this](){Mode->StartFruitGame();}),TEXT("TibetFruitGame"));
    auto Fruits=SNew(SHorizontalBox);
    for(int32 I=0;I<3;++I)
        Fruits->AddSlot().FillWidth(1).Padding(1,0)[Button(TAttribute<FText>::CreateLambda([this,I](){
            return FText::FromString(FString::Printf(TEXT("%d  %s"),I+1,*Mode->FruitName(I)));}),
            FSimpleDelegate::CreateLambda([this,I](){Mode->PickFruit(I);}),false,FName(*FString::Printf(TEXT("TibetFruit%d"),I)))];
    Column->AddSlot().AutoHeight().Padding(0,3)[SNew(SBox).Visibility_Lambda([this](){
        return Mode->FeedingPanel()==2?EVisibility::Visible:EVisibility::Collapsed;})[Fruits]];
    Action(3,bTouch?TEXT("Play again"):TEXT("1  Play again"),bTouch?TEXT("再玩一次"):TEXT("1  再玩一次"),FSimpleDelegate::CreateLambda([this](){Mode->StartFruitGame();}),TEXT("TibetFruitReplay"));
    Column->AddSlot().AutoHeight().Padding(0,3)[Button(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Return"),TEXT("返回"));}),
        FSimpleDelegate::CreateLambda([this](){Mode->CloseFeeding();}),false,TEXT("TibetCloseFeeding"))];
    return SNew(SBorder).Visibility_Lambda([this](){return Mode->FeedingPanel()?EVisibility::Visible:EVisibility::Collapsed;})
        .HAlign(HAlign_Center).VAlign(VAlign_Center).BorderImage(PanelBrush()).BorderBackgroundColor(FLinearColor(0,0,0,.46f))
        [SNew(SBox).WidthOverride(320)[SNew(SBorder).BorderImage(PanelBrush()).BorderBackgroundColor(TimePanel).Padding(15)[Column]]];
}

TSharedRef<SWidget> STibetPlayOverlay::Dedication()
{
    auto Column=SNew(SVerticalBox);
    DedicationFields=Column;
    const auto History=Mode->Dedications();
    Column->AddSlot().AutoHeight()[Label(Local(TEXT("Lamp dedication"),TEXT("供燈回向")),20,Cream)];
    Column->AddSlot().AutoHeight().Padding(0,7,0,2)[Label(Local(TEXT("Pilgrim name (optional, up to 24 characters)"),
        TEXT("署名（選填，最多 24 字）")),14,Cream)];
    const auto Name=SNew(SEditableTextBox).Tag(TEXT("TibetPilgrimName")).Font(Font(16))
        .Text(History.IsEmpty()?FText::GetEmpty():FText::FromString(History.Last().Pilgrim));
    Column->AddSlot().AutoHeight()[Name];
    Column->AddSlot().AutoHeight().Padding(0,8,0,2)[Label(Local(TEXT("Prayer (up to 120 characters)"),TEXT("回向文（最多 120 字）")),14,Cream)];
    const auto Prayer=SNew(SEditableTextBox).Tag(TEXT("TibetPrayer")).Font(Font(16))
        .HintText(Local(TEXT("Write a prayer or choose a verse below"),TEXT("寫下祈願，或選擇下方偈頌")));
    Column->AddSlot().AutoHeight()[Prayer];
    const struct { const TCHAR* En; const TCHAR* Zh; const TCHAR* VerseEn; const TCHAR* VerseZh; } Verses[]={
        {TEXT("Lamp aspiration"),TEXT("供燈發願"),TEXT("May the bowl become the universe, the wick Mount Meru, and the ghee an ocean shining on all beings."),
            TEXT("願燈碗化為三千大千世界，願燈芯化為須彌山王，願酥油化為無邊大海，以此光明照徹法界一切有情。")},
        {TEXT("Bodhisattva vow"),TEXT("菩薩行願"),TEXT("For as long as space endures and living beings remain, may I too abide to dispel the misery of the world."),
            TEXT("乃至有虛空，以及眾生住，願吾住世間，盡除眾生苦。")},
        {TEXT("Loving-kindness"),TEXT("慈悲回向"),TEXT("May this light free my parents and all beings from suffering and help their wisdom and joy grow."),
            TEXT("願以此燈光明，回向累世父母冤親，離苦得樂，福慧雙增，所求善願悉皆圓滿。")}
    };
    auto Choices=SNew(SHorizontalBox);
    for (int32 Index=0; Index<UE_ARRAY_COUNT(Verses); ++Index)
    {
        const auto& Verse=Verses[Index];
        const FText Words=Local(Verse.VerseEn,Verse.VerseZh);
        Choices->AddSlot().FillWidth(1).Padding(1,0)[Button(Local(Verse.En,Verse.Zh),
            FSimpleDelegate::CreateLambda([Prayer,Words](){Prayer->SetText(Words);}),false,
            FName(*FString::Printf(TEXT("TibetPrayerPreset%d"),Index)))];
    }
    Column->AddSlot().AutoHeight().Padding(0,4)[Choices];
    const auto Submit=Button(Local(TEXT("Inscribe dedication"),TEXT("銘刻回向")),
        FSimpleDelegate::CreateLambda([this,Name,Prayer](){
            if (Mode->InscribeDedication(Name->GetText().ToString(),Prayer->GetText().ToString()))
            {
                Show(ETibetPage::Dedication);
                FSlateApplication::Get().SetKeyboardFocus(SharedThis(this),EFocusCause::SetDirectly);
            }
            else Prayer->SetError(Local(TEXT("Unable to save this dedication"),TEXT("無法儲存此回向")));
        }),true,TEXT("TibetInscribePrayer"));
    Submit->SetEnabled(TAttribute<bool>::CreateLambda([Name,Prayer](){
        const FString Words=Prayer->GetText().ToString().TrimStartAndEnd();
        return !Words.IsEmpty() && Words.Len()<=120 && Name->GetText().ToString().TrimStartAndEnd().Len()<=24;
    }));
    Column->AddSlot().AutoHeight()[Submit];
    Column->AddSlot().AutoHeight().Padding(0,14,0,4)[Label(Local(TEXT("My dedications"),TEXT("我的回向紀錄")),18,Cream)];
    if (History.IsEmpty())
        Column->AddSlot().AutoHeight()[Label(Local(TEXT("Your first prayer will appear here."),TEXT("寫下第一則祈願後，即可在此重讀。")),14,Cream)];
    for (int32 I=History.Num()-1; I>=0; --I)
    {
        const auto& Entry=History[I];
        const FString Pilgrim=Entry.Pilgrim.IsEmpty()?Mode->Local(TEXT("Pilgrim"),TEXT("朝聖行者")):Entry.Pilgrim;
        Column->AddSlot().AutoHeight().Padding(0,3)[Label(FText::FromString(Pilgrim+TEXT("  ·  ")+Entry.Prayer),15,Cream)];
    }
    return Column;
}
