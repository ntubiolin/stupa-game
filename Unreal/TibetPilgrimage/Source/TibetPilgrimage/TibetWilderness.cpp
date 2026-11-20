#include "TibetGameMode.h"
#include "Kismet/GameplayStatics.h"

namespace
{
struct FWildKind
{
    FName Tag;
    const TCHAR* Mesh;
    const TCHAR* English;
    const TCHAR* Chinese;
    float ChaseSpeed;
};
const FWildKind Kinds[] = {
    {TEXT("preta"),TEXT("Preta"),TEXT("Karmic Spirit Orb"),TEXT("餓鬼靈球"),118.f},
    {TEXT("tsen"),TEXT("TsenRider"),TEXT("Tsen Rider"),TEXT("赤甲贊騎"),155.f},
    {TEXT("migoi"),TEXT("SnowMigoi"),TEXT("Migoi"),TEXT("雪人"),95.f}
};
const FVector Camps[] = {{-185,-260,0},{125,240,0},{410,-390,0}};
}

void ATibetGameMode::RefreshWilderness(int32 Remaining)
{
    // Finishing one encounter leaves the other inhabitants at their current
    // positions and health. A reload reconstructs the wave from quest progress.
    for (int32 I=WildernessPack.Num()-1; I>=0; --I)
    {
        AActor* Actor=WildernessPack[I].Actor.Get();
        if (Remaining==0 || !Actor || (Actor==Focus && EnemyHealth==0))
        {
            if (Actor) Actor->Destroy();
            if (Focus==Actor) Focus=nullptr;
            WildernessPack.RemoveAt(I);
        }
    }
    if (Remaining==0) return;
    if (WildernessPack.IsEmpty())
    {
        const int32 Completed=GetStepProgress();
        const int32 Count=FMath::Min(3, Remaining);
        for (int32 I=0; I<Count; ++I)
        {
            const int32 Index=(Completed+I)%UE_ARRAY_COUNT(Kinds);
            const auto& Type=Kinds[Index];
            const FString Mesh=FString::Printf(TEXT("/Game/Figures/%s.%s"),Type.Mesh,Type.Mesh);
            AActor* Actor=MeshActor(Camps[Index],Mesh,FVector::OneVector);
            if (!Actor) continue;
            Actor->Tags.Append({TEXT("TibetWildEnemy"),Type.Tag});
            Actor->SetActorRotation(FRotator(0,-90,0));
            WildernessPack.Add({Actor,Index});
        }
    }
    const APawn* Player=UGameplayStatics::GetPlayerPawn(this,0);
    UpdateWilderness(Player ? Player->GetActorLocation() : FVector(-2000,0,90),0.f);
    UE_LOG(LogTemp,Display,TEXT("TIBET_WILD_PACK progress=%d living=%d"),GetStepProgress(),WildernessPack.Num());
}

void ATibetGameMode::UpdateWilderness(const FVector& Player, float Dt)
{
    FTibetWildEnemy* Closest=nullptr;
    double Best=MAX_dbl;
    const float Now=GetWorld()->GetTimeSeconds();
    for (FTibetWildEnemy& Member : WildernessPack)
    {
        AActor* Actor=Member.Actor.Get();
        if (!Actor) continue;
        const FVector Delta=Player-Actor->GetActorLocation();
        const double Distance=Delta.Size2D();
        // A small preference for the current opponent keeps its health bar steady.
        const double Score=Distance-(Actor==Focus ? 85. : 0.);
        if (Score<Best) { Closest=&Member; Best=Score; }
        if (Actor!=Focus && Now>=Member.StunnedUntil && Distance>360 && Distance<950)
        {
            const FVector Dir=Delta.GetSafeNormal2D();
            Actor->AddActorWorldOffset(Dir*FMath::Min<double>(Distance-360,Dt*Kinds[Member.Kind].ChaseSpeed*.55f));
            Actor->SetActorRotation(FRotator(0,Dir.Rotation().Yaw+90,0));
        }
    }
    if (!Closest || Focus==Closest->Actor.Get()) return;
    for (FTibetWildEnemy& Member : WildernessPack)
        if (Member.Actor.Get()==Focus) { Member.Health=EnemyHealth; Member.StunnedUntil=Now+Stun; }
    Focus=Closest->Actor.Get();
    EnemyHealth=Closest->Health;
    EnemyMaximum=3;
    EnemyTrailing=EnemyHealth;
    LastHitTime=-10.f;
    Stun=FMath::Max(0.f,Closest->StunnedUntil-Now);
}

float ATibetGameMode::PursuitSpeed(bool bBoss) const
{
    for (const FTibetWildEnemy& Member : WildernessPack)
        if (Member.Actor.Get()==Focus) return Kinds[Member.Kind].ChaseSpeed;
    return bBoss ? 165.f : 115.f;
}

FString ATibetGameMode::EnemyLabel() const
{
    for (const FTibetWildEnemy& Member : WildernessPack)
        if (Member.Actor.Get()==Focus) return Local(Kinds[Member.Kind].English,Kinds[Member.Kind].Chinese);
    return Local(TEXT("Spirit"),TEXT("靈障"));
}
