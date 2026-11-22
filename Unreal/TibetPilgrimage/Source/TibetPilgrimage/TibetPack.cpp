#include "TibetPack.h"
#include "TibetGameMode.h"
#include "Engine/World.h"

namespace
{
const FTibetItemInfo Items[] = {
    {TEXT("Amrita Pills"), TEXT("甘露丸"), TEXT("Restore 35% life now, then 5% each second for 3 seconds."), TEXT("立即回復 35% 體力，接著每秒回復 5%，持續三秒。"), TEXT("Carry four. Returning to Boudhanath replenishes the pouch."), TEXT("隨身四丸，返回博達哈補滿。")},
    {TEXT("Bronze Vajra"), TEXT("銅金剛杵"), TEXT("Main hand · +1 damage to each damaging ritual hit."), TEXT("主手法器・命中的攻擊法術額外造成 1 點傷害。"), TEXT("Complete Lobsang’s vow after the three butter lamps."), TEXT("點亮三盞酥油燈後，向洛桑回報序章誓願。")},
    {TEXT("Bronze Bell"), TEXT("銅鈴"), TEXT("Off hand · +10 maximum mantra."), TEXT("副手法器・法力上限增加 10。"), TEXT("Liberate your first spirit in the Northern Wilderness."), TEXT("在北郊原野首次調伏靈障。")},
    {TEXT("Pulu Robe"), TEXT("氆氌法衣"), TEXT("Body · +15 maximum life."), TEXT("身穿法衣・體力上限增加 15。"), TEXT("Complete the night defence at Samye."), TEXT("在桑耶寺完成夜間守護。")},
    {TEXT("Ancient Pilgrim’s Map"), TEXT("古老的朝聖地圖"), TEXT("Open the painted route chart from the quick slot."), TEXT("從快捷欄展開朝聖路線圖。"), TEXT("Recover the map beside the tilted mani cairn in the Northern Wilderness."), TEXT("在北郊原野傾斜的瑪尼堆旁尋回。")},
    {TEXT("Lineage Keepsake Thangka"), TEXT("蓮師同框紀念唐卡"), TEXT("Commemorative Thangka of Guru Padmasambhava & the Pilgrim together; view or export as PNG."), TEXT("虛空蓮師與行者同框之通關紀念唐卡；可隨時展開瞻仰或匯出 PNG 紀念圖檔。"), TEXT("Return to Boudhanath Stupa in the finale and behold Guru Padmasambhava in the sky."), TEXT("於終章返回博達哈大佛塔，步入金蓮壇城瞻仰虛空蓮師顯相後獲贈。")}
};
static_assert(UE_ARRAY_COUNT(Items) == int(ETibetItem::Count));
}
const FTibetItemInfo& TibetItemInfo(ETibetItem Item) { return Items[int(Item)]; }

bool ATibetGameMode::OwnsItem(ETibetItem Item) const
{
    if (!Save) return false;
    const int32 Wild = Save->Steps.FindRef(TEXT("wild"));
    switch (Item)
    {
    case ETibetItem::Amrita: return true;
    case ETibetItem::Vajra: return Save->Steps.FindRef(TEXT("stupa")) >= 4;
    case ETibetItem::Bell: return Wild > 0 || Save->Counts.FindRef(TEXT("wild")) > 0;
    case ETibetItem::Map: return Wild >= 2;
    case ETibetItem::Robe: return Save->Steps.FindRef(TEXT("samye")) >= 3;
    case ETibetItem::Thangka: return Save->bComplete;
    default: return false;
    }
}
bool ATibetGameMode::IsEquipped(ETibetItem Item) const
{
    return OwnsItem(Item) && (Save->Equipment & (1 << int(Item))) != 0;
}
void ATibetGameMode::ToggleEquipment(ETibetItem Item)
{
    if (Item < ETibetItem::Vajra || Item > ETibetItem::Robe || !OwnsItem(Item)) return;
    Save->Equipment ^= 1 << int(Item);
    Health = FMath::Min(Health, MaxHealth());
    Mana = FMath::Min(Mana, MaxMana());
    Store();
}
ETibetItem ATibetGameMode::QuickItem() const
{
    return Save && Save->bQuickMap && OwnsItem(ETibetItem::Map) ? ETibetItem::Map : ETibetItem::Amrita;
}
void ATibetGameMode::SetQuickItem(ETibetItem Item)
{
    if ((Item != ETibetItem::Map && Item != ETibetItem::Amrita) || !OwnsItem(Item)) return;
    Save->bQuickMap = Item == ETibetItem::Map;
    Store();
}
float ATibetGameMode::MaxHealth() const { return IsEquipped(ETibetItem::Robe) ? 115.f : 100.f; }
float ATibetGameMode::MaxMana() const { return IsEquipped(ETibetItem::Bell) ? 110.f : 100.f; }
int32 ATibetGameMode::Pills() const { return Save ? FMath::Clamp(Save->PillCharges, 0, 4) : 0; }

void ATibetGameMode::UsePill()
{
    if (!Save || bTravel || GetWorld()->IsPaused() || GetWorld()->GetTimeSeconds() < NextPill) return;
    if (Health >= MaxHealth()) { SetNotice(Local(TEXT("Life is full."), TEXT("體力已滿。"))); return; }
    if (!Pills()) { SetNotice(Local(TEXT("The pill pouch is empty."), TEXT("甘露丸已用盡。"))); return; }
    Save->PillCharges = Pills() - 1;
    const float Now = GetWorld()->GetTimeSeconds();
    NextPill = Now + 1;
    Health = FMath::Min(MaxHealth(), Health + FMath::RoundToFloat(MaxHealth() * .35f));
    for (int32 Second = 1; Second <= 3; ++Second) HealTicks.Add(Now + Second);
    SetNotice(Local(TEXT("Amrita · life restored"), TEXT("服用甘露丸・回復體力")));
    Store();
}
void ATibetGameMode::UpdatePills(float Now)
{
    for (int32 I = HealTicks.Num() - 1; I >= 0; --I)
    {
        if (Now < HealTicks[I]) continue;
        Health = FMath::Min(MaxHealth(), Health + FMath::RoundToFloat(MaxHealth() * .05f));
        HealTicks.RemoveAtSwap(I);
    }
}
