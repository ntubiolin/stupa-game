#include "TibetPlayOverlay.h"
#include "TibetGameMode.h"
#include "Styling/CoreStyle.h"
#include "Widgets/Input/SSlider.h"
#include "Widgets/Input/SButton.h"
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
    Content->AddSlot().AutoHeight().HAlign(HAlign_Center)
        [Label(TAttribute<FText>::CreateLambda([this](){return FText::FromString(Mode->TimeLabel());}),14,Cream)];
    auto Rates=SNew(SHorizontalBox);
    const int32 Values[]={0,1,4};
    const FName Tags[]={TEXT("TibetClockPause"),TEXT("TibetClockNormal"),TEXT("TibetClockFast")};
    for(int32 I=0;I<3;++I)
    {
        const int32 Rate=Values[I];
        Rates->AddSlot().FillWidth(1).Padding(1,1)[SNew(SBox).MinDesiredHeight(bTouch?44.f:30.f)
            [SNew(SButton).Tag(Tags[I]).IsFocusable(false).HAlign(HAlign_Center).VAlign(VAlign_Center)
             .ContentPadding(FMargin(2,1)).ButtonColorAndOpacity_Lambda([this,Rate](){
                return Mode->ClockRate()==Rate?FLinearColor(FColor(244,197,112)):FLinearColor(FColor(48,64,63));})
             .OnClicked_Lambda([this,Rate](){Mode->SetClockRate(Rate);return FReply::Handled();})
             [SNew(STextBlock).Font(Font(14)).ColorAndOpacity_Lambda([this,Rate](){
                return FSlateColor(Mode->ClockRate()==Rate?FLinearColor(FColor(31,39,38)):Cream);})
              .Text_Lambda([this,Rate](){return Rate?FText::FromString(FString::Printf(TEXT("%d×"),Rate)):
                    Local(TEXT("Pause"),TEXT("暫停"));})]]];
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
        [Button(TAttribute<FText>::CreateLambda([this](){return bTouch?Local(TEXT("Feed macaque"),TEXT("餵獼猴")):
            Local(TEXT("F  Feed macaque"),TEXT("F  餵獼猴"));}),
            FSimpleDelegate::CreateLambda([this](){Mode->BeginFeeding();}),true,TEXT("TibetFeedMacaque"))]];
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
    Action(1,TEXT("Offer a banana"),TEXT("直接餵香蕉"),FSimpleDelegate::CreateLambda([this](){Mode->QuickFeed();}),TEXT("TibetQuickFeed"));
    Action(1,TEXT("Match five fruits"),TEXT("挑戰五輪配對"),FSimpleDelegate::CreateLambda([this](){Mode->StartFruitGame();}),TEXT("TibetFruitGame"));
    auto Fruits=SNew(SHorizontalBox);
    for(int32 I=0;I<3;++I)
        Fruits->AddSlot().FillWidth(1).Padding(1,0)[Button(TAttribute<FText>::CreateLambda([this,I](){
            return FText::FromString(FString::Printf(TEXT("%d  %s"),I+1,*Mode->FruitName(I)));}),
            FSimpleDelegate::CreateLambda([this,I](){Mode->PickFruit(I);}),false,FName(*FString::Printf(TEXT("TibetFruit%d"),I)))];
    Column->AddSlot().AutoHeight().Padding(0,3)[SNew(SBox).Visibility_Lambda([this](){
        return Mode->FeedingPanel()==2?EVisibility::Visible:EVisibility::Collapsed;})[Fruits]];
    Action(3,TEXT("Play again"),TEXT("再玩一次"),FSimpleDelegate::CreateLambda([this](){Mode->StartFruitGame();}),TEXT("TibetFruitReplay"));
    Column->AddSlot().AutoHeight().Padding(0,3)[Button(TAttribute<FText>::CreateLambda([this](){return Local(TEXT("Return"),TEXT("返回"));}),
        FSimpleDelegate::CreateLambda([this](){Mode->CloseFeeding();}),false,TEXT("TibetCloseFeeding"))];
    return SNew(SBorder).Visibility_Lambda([this](){return Mode->FeedingPanel()?EVisibility::Visible:EVisibility::Collapsed;})
        .HAlign(HAlign_Center).VAlign(VAlign_Center).BorderImage(PanelBrush()).BorderBackgroundColor(FLinearColor(0,0,0,.46f))
        [SNew(SBox).WidthOverride(320)[SNew(SBorder).BorderImage(PanelBrush()).BorderBackgroundColor(TimePanel).Padding(15)[Column]]];
}
