#include "TibetMacaques.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Engine/StaticMesh.h"

namespace
{
enum EPart { Body, Head, LeftArm, RightArm, LeftLeg, RightLeg, Tail, TailTip, Fruit };
const TCHAR* Meshes[] = {TEXT("MacaqueBody"),TEXT("MacaqueHead"),TEXT("MacaqueArm"),TEXT("MacaqueArm"),
    TEXT("MacaqueLeg"),TEXT("MacaqueLeg"),TEXT("MacaqueTail"),TEXT("MacaqueTailTip"),TEXT("OfferingBanana")};
FVector Ring(float Angle,float Radius,bool Perched)
{
    return FVector(3400+Radius*FMath::Cos(Angle),Radius*FMath::Sin(Angle),Perched?140.5:0);
}
}

ATibetMacaques::ATibetMacaques()
{
    PrimaryActorTick.bCanEverTick=true;
    PrimaryActorTick.TickInterval=1.f/30.f;
    RootComponent=CreateDefaultSubobject<USceneComponent>(TEXT("Boudhanath macaques"));
}
void ATibetMacaques::BeginPlay()
{
    Super::BeginPlay();
    for(const TCHAR* Name : Meshes)
    {
        auto* Part=NewObject<UInstancedStaticMeshComponent>(this);
        Part->SetupAttachment(RootComponent);
        Part->SetMobility(EComponentMobility::Movable);
        Part->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Part->SetCanEverAffectNavigation(false);
        const FString Path=FString::Printf(TEXT("/Game/Figures/Courtyard/%s/StaticMeshes/%s.%s"),Name,Name,Name);
        Part->SetStaticMesh(LoadObject<UStaticMesh>(nullptr,*Path));
        ensureMsgf(Part->GetStaticMesh(),TEXT("Missing web macaque segment %s"),*Path);
        Part->RegisterComponent();
        for(int32 I=0;I<5;++I) Part->AddInstance(FTransform::Identity);
        Parts.Add(Part);
    }
    const float Degrees[]={161,-101,-173,38,118};
    const float Radii[]={1660,1660,2690,2320,2380};
    for(int32 I=0;I<5;++I)
    {
        FAnimal& M=Animals.AddDefaulted_GetRef();
        M.Home=M.Angle=FMath::DegreesToRadians(Degrees[I]); M.Radius=Radii[I];
        M.bPerched=I<2; M.Position=Ring(M.Angle,M.Radius,M.bPerched);
        M.Heading=Degrees[I]; Pose(I,0);
    }
}
int32 ATibetMacaques::Nearest(const FVector& Player,double Range) const
{
    int32 Result=INDEX_NONE;
    double Best=Range;
    for(int32 I=0;I<Animals.Num();++I)
    {
        const auto& M=Animals[I];
        const double D=FVector::Dist2D(M.Position,Player);
        if(D<Best && FMath::Abs(M.Position.Z-Player.Z)<260 && M.Cooldown<=0 && M.Feeding<0)
        { Result=I; Best=D; }
    }
    return Result;
}
FVector ATibetMacaques::Location(int32 I) const { return Animals.IsValidIndex(I)?Animals[I].Position:FVector::ZeroVector; }
bool ATibetMacaques::Offer(int32 I,const FVector& From)
{
    if(!Animals.IsValidIndex(I) || Animals[I].Cooldown>0 || FVector::Dist2D(From,Location(I))>510) return false;
    Animals[I].FruitFrom=From+FVector(0,0,32); Animals[I].Feeding=0; Animals[I].Cooldown=13;
    return true;
}
bool ATibetMacaques::IsEating(int32 I) const { return Animals.IsValidIndex(I) && Animals[I].Feeding>=0; }
bool ATibetMacaques::HoldingFruit(int32 I,FVector& FruitPosition,float& ToeClearance) const
{
    if(!Animals.IsValidIndex(I) || Animals[I].Feeding<.68f) return false;
    FTransform Banana,Leg;
    if(!Parts[Fruit]->GetInstanceTransform(I,Banana,true) || !Parts[RightLeg]->GetInstanceTransform(I,Leg,true))
        return false;
    FruitPosition=Banana.GetLocation();
    ToeClearance=Leg.TransformPosition(FVector(0,0,-20)).Z-3*Leg.GetScale3D().Z-Location(I).Z;
    return true;
}
void ATibetMacaques::Tick(float Dt)
{
    Super::Tick(Dt); Age+=Dt;
    for(int32 I=0;I<Animals.Num();++I) Pose(I,Dt);
}
void ATibetMacaques::Pose(int32 I,float Dt)
{
    auto& M=Animals[I];
    M.Cooldown=FMath::Max(0.f,M.Cooldown-Dt);
    if(M.Feeding>=0) { M.Feeding+=Dt; if(M.Feeding>3.1f) M.Feeding=-1; }
    const bool Eating=M.Feeding>=0, Sleeping=Daylight<.22f && !Eating && Attending!=I;
    const bool Roam=!Eating && !Sleeping && Attending!=I && FMath::Sin(Age*.36f+I)>-.22f;
    if(Roam)
    {
        const float Old=M.Angle;
        M.Angle=FMath::FInterpConstantTo(M.Angle,M.Home+.19f*FMath::Sin(Age*.15f+I),Dt,M.bPerched?.024f:.045f);
        M.Heading=FMath::FixedTurn(M.Heading,FMath::RadiansToDegrees(M.Angle)+(M.Angle>=Old?90:-90),Dt*170);
        M.Position=Ring(M.Angle,M.Radius,M.bPerched);
    }
    else if(Eating) M.Heading=FMath::FixedTurn(M.Heading,(M.FruitFrom-M.Position).Rotation().Yaw,Dt*210);
    const float Walk=FMath::Sin(Age*9.5f+I), Munch=FMath::Sin(Age*11.f+I);
    // UE pitch carries a downward limb toward +X at positive angles. Match the
    // web rig's forward paws and keep the sitting toes on the perch or paving.
    const float Back=Sleeping?-44.f:Roam?-31.f:-8.f;
    const float RestLeg=Sleeping?72.f:57.f;
    const FQuat Spine=FRotator(Back,0,0).Quaternion();
    const FVector SittingToe=Spine.RotateVector(FVector(-2,0,2)+
        FRotator(RestLeg,0,0).RotateVector(FVector(0,0,-20)));
    const float H=Roam?24.f:3.f-SittingToe.Z;
    const FTransform Root(FRotator(0,M.Heading,0),M.Position,FVector(1.55));
    const FTransform Trunk=FTransform(Spine,
        FVector(0,0,H+(Roam?FMath::Abs(Walk)*6:0)))*Root;
    auto Place=[&](int32 Part,const FTransform& T){Parts[Part]->UpdateInstanceTransform(I,T,false,true,true);};
    Place(Body,Trunk);
    Place(Head,FTransform(FRotator(Sleeping?-26.f:Roam?25.f:Eating?-9-Munch*7:-5,
        Eating?0:22*FMath::Sin(Age*1.4f+I),0),FVector(3,0,30))*Trunk);
    FTransform Hand;
    for(int32 J=0;J<2;++J)
    {
        const float Sign=J?1.f:-1.f;
        const float Swing=Roam?37*Walk*Sign:0;
        const float Reach=Eating?(J?125+Munch*8:48-Munch*5):Sleeping?69:Roam?32+Swing:18;
        const FTransform Arm=FTransform(FRotator(Reach,Eating&&J?-23:0,0),FVector(2,Sign*12,24))*Trunk;
        Place(LeftArm+J,Arm);
        Place(LeftLeg+J,FTransform(FRotator(Roam?19-Swing:RestLeg,0,0),FVector(-2,Sign*8.5,2))*Trunk);
        if(J)
        {
            const FVector Palm=Arm.TransformPosition(FVector(0,0,-23));
            // The curved fruit stands upright beside the muzzle as the wrist
            // rises; inheriting the straight arm pitch drives it into the chest.
            Hand=FTransform(FRotator(-18,M.Heading,12),Palm+FVector(0,0,4),Root.GetScale3D());
        }
    }
    const FTransform TailBase=FTransform(FRotator(0,0,13*FMath::Sin(Age*2.6f+I)),FVector(-10,0,4))*Trunk;
    Place(Tail,TailBase);
    Place(TailTip,FTransform(FRotator(0,0,16*FMath::Cos(Age*3.4f+I)),FVector(-16,0,14))*TailBase);
    if(Eating && M.Feeding<.68f)
    {
        const float T=M.Feeding/.68f;
        FVector P=FMath::Lerp(M.FruitFrom,Hand.GetLocation(),T);
        P.Z+=95*4*T*(1-T);
        Place(Fruit,FTransform(FRotator(T*230,0,0),P,FVector(1.65)));
    }
    else if(Eating) Place(Fruit,Hand);
    else Place(Fruit,FTransform(FQuat::Identity,M.Position,FVector::ZeroVector));
}
